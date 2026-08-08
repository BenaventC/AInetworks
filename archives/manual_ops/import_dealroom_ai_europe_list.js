const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const APPLY = process.argv.includes('--apply');
const DB_PATH = path.join(__dirname, '..', '..', 'database.db');
const SOURCE_URL = 'https://dealroom.co/lists/ai-startups-europe/';
const SOURCE_LABEL = 'Dealroom AI startups in Europe';
const COUNTRY_FALLBACK = 'NA';
const CITY_FALLBACK = 'NA';
const ORG_TYPE_FALLBACK = 'NA';

function canonicalName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x2F;/g, '/');
}

function stripTags(str) {
  return decodeHtmlEntities(String(str || '').replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFundsToMillions(fundText) {
  const txt = String(fundText || '').trim();
  if (!txt) return null;

  const m = txt.match(/\$\s*([0-9]+(?:\.[0-9]+)?)\s*([BM])/i);
  if (!m) return null;

  const value = Number.parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  if (!Number.isFinite(value)) return null;

  const millions = unit === 'B' ? value * 1000 : value;
  return Number(millions.toFixed(3)).toString();
}

function parseLocation(locRaw) {
  const cleaned = stripTags(locRaw);
  if (!cleaned) {
    return { city: CITY_FALLBACK, country: COUNTRY_FALLBACK };
  }

  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      city: parts.slice(0, -1).join(', ') || CITY_FALLBACK,
      country: parts[parts.length - 1] || COUNTRY_FALLBACK
    };
  }

  return {
    city: CITY_FALLBACK,
    country: parts[0] || COUNTRY_FALLBACK
  };
}

function parseRowsFromHtml(html) {
  const rows = [];
  const tableMatch = html.match(/<table class="lp-table">([\s\S]*?)<\/table>/i);
  if (!tableMatch) return rows;

  const tbodyMatch = tableMatch[1].match(/<tbody>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return rows;

  const trRegex = /<tr>([\s\S]*?)<\/tr>/gi;
  let tr;

  while ((tr = trRegex.exec(tbodyMatch[1])) !== null) {
    const block = tr[1];

    const rank = stripTags((block.match(/<span class="lp-rank-num">([\s\S]*?)<\/span>/i) || [])[1]);
    const href = stripTags((block.match(/<a class="lp-name" href="([^"]+)"/i) || [])[1]);
    const name = stripTags((block.match(/<a class="lp-name"[^>]*>([\s\S]*?)<\/a>/i) || [])[1]);
    const tagline = stripTags((block.match(/<span class="lp-tagline">([\s\S]*?)<\/span>/i) || [])[1]);
    const founded = stripTags((block.match(/<td class="lp-founded">([\s\S]*?)<\/td>/i) || [])[1]);
    const loc = stripTags((block.match(/<td class="lp-loc">([\s\S]*?)<\/td>/i) || [])[1]);
    const fund = stripTags((block.match(/<span class="lp-fund-val">([\s\S]*?)<\/span>/i) || [])[1]);

    if (!name) continue;

    const foundedYear = /^\d{4}$/.test(founded) ? Number(founded) : null;
    const fundsRaised = parseFundsToMillions(fund);
    const location = parseLocation(loc);

    rows.push({
      rank: rank ? Number(rank) : null,
      name,
      dealroom_url: href || null,
      description: tagline || null,
      founded_year: foundedYear,
      headquarter_city: location.city,
      country: location.country,
      funds_raised: fundsRaised,
      source_funding_text: fund || null
    });
  }

  return rows;
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function done(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function isMissingText(value) {
  const t = String(value || '').trim();
  if (!t) return true;
  return t.toLowerCase() === 'na';
}

async function main() {
  const response = await fetch(SOURCE_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; data-enrichment-script/1.0)'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching Dealroom list`);
  }

  const html = await response.text();
  const startups = parseRowsFromHtml(html);

  if (!startups.length) {
    throw new Error('No startup rows parsed from Dealroom list');
  }

  const db = new sqlite3.Database(DB_PATH);

  try {
    const existingRows = await all(
      db,
      `SELECT
         id,
         name,
         country,
         headquarter_city,
         founded_year,
         description,
         website,
         funds_raised,
         sector,
         organization_type
       FROM enterprises`
    );
    const existingByKey = new Map(existingRows.map((r) => [canonicalName(r.name), r]));

    let alreadyInDb = 0;
    let missingInDb = 0;
    let created = 0;
    let updated = 0;
    let countryUpdated = 0;
    let cityUpdated = 0;
    let foundedUpdated = 0;
    let websiteUpdated = 0;
    let fundsUpdated = 0;
    let descriptionUpdated = 0;
    let sectorUpdated = 0;
    let orgTypeUpdated = 0;

    const sampleExisting = [];
    const sampleCreated = [];

    for (const s of startups) {
      const key = canonicalName(s.name);
      if (!key) continue;

      if (existingByKey.has(key)) {
        alreadyInDb += 1;
        if (sampleExisting.length < 30) sampleExisting.push(s.name);

        const existing = existingByKey.get(key);
        const updates = [];
        const params = [];

        if (isMissingText(existing.country) && !isMissingText(s.country)) {
          updates.push('country = ?');
          params.push(s.country);
          countryUpdated += 1;
        }

        if (isMissingText(existing.headquarter_city) && !isMissingText(s.headquarter_city)) {
          updates.push('headquarter_city = ?');
          params.push(s.headquarter_city);
          cityUpdated += 1;
        }

        if ((!existing.founded_year || Number(existing.founded_year) <= 0) && Number.isFinite(Number(s.founded_year))) {
          updates.push('founded_year = ?');
          params.push(Number(s.founded_year));
          foundedUpdated += 1;
        }

        if (isMissingText(existing.website) && !isMissingText(s.dealroom_url)) {
          updates.push('website = ?');
          params.push(s.dealroom_url);
          websiteUpdated += 1;
        }

        if (isMissingText(existing.funds_raised) && !isMissingText(s.funds_raised)) {
          updates.push('funds_raised = ?');
          params.push(s.funds_raised);
          fundsUpdated += 1;
        }

        if (isMissingText(existing.description) && !isMissingText(s.description)) {
          const descParts = [];
          if (s.description) descParts.push(s.description);
          descParts.push(`${SOURCE_LABEL} rank #${s.rank || 'NA'}. Funding shown: ${s.source_funding_text || 'NA'}. Source: ${SOURCE_URL}`);
          updates.push('description = ?');
          params.push(descParts.join(' '));
          descriptionUpdated += 1;
        }

        if (isMissingText(existing.sector)) {
          updates.push('sector = ?');
          params.push('Artificial Intelligence');
          sectorUpdated += 1;
        }

        if (isMissingText(existing.organization_type)) {
          updates.push('organization_type = ?');
          params.push(ORG_TYPE_FALLBACK);
          orgTypeUpdated += 1;
        }

        if (updates.length > 0) {
          updates.push('updated_at = CURRENT_TIMESTAMP');
          params.push(existing.id);

          if (APPLY) {
            await run(
              db,
              `UPDATE enterprises
               SET ${updates.join(', ')}
               WHERE id = ?`,
              params
            );
          }
          updated += 1;
        }

        continue;
      }

      missingInDb += 1;
      if (!APPLY) continue;

      const descParts = [];
      if (s.description) descParts.push(s.description);
      descParts.push(`${SOURCE_LABEL} rank #${s.rank || 'NA'}. Funding shown: ${s.source_funding_text || 'NA'}. Source: ${SOURCE_URL}`);
      const fullDescription = descParts.join(' ');

      await run(
        db,
        `INSERT INTO enterprises (
          name,
          sector,
          organization_type,
          country,
          headquarter_city,
          founded_year,
          description,
          website,
          funds_raised,
          is_validated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          s.name,
          'Artificial Intelligence',
          ORG_TYPE_FALLBACK,
          s.country || COUNTRY_FALLBACK,
          s.headquarter_city || CITY_FALLBACK,
          s.founded_year,
          fullDescription,
          s.dealroom_url,
          s.funds_raised,
          3
        ]
      );

      created += 1;
      existingByKey.set(key, { id: -1, name: s.name });
      if (sampleCreated.length < 30) sampleCreated.push(s.name);
    }

    console.log(`SOURCE_COMPANIES=${startups.length}`);
    console.log(`ALREADY_IN_DB=${alreadyInDb}`);
    console.log(`MISSING_IN_DB=${missingInDb}`);
    console.log(`APPLY_MODE=${APPLY ? 'YES' : 'NO'}`);
    console.log(`CREATED=${created}`);
    console.log(`UPDATED=${updated}`);
    console.log(`UPDATED_COUNTRY=${countryUpdated}`);
    console.log(`UPDATED_CITY=${cityUpdated}`);
    console.log(`UPDATED_FOUNDED_YEAR=${foundedUpdated}`);
    console.log(`UPDATED_WEBSITE=${websiteUpdated}`);
    console.log(`UPDATED_FUNDS_RAISED=${fundsUpdated}`);
    console.log(`UPDATED_DESCRIPTION=${descriptionUpdated}`);
    console.log(`UPDATED_SECTOR=${sectorUpdated}`);
    console.log(`UPDATED_ORGANIZATION_TYPE=${orgTypeUpdated}`);
    console.log(`SAMPLE_EXISTING=${JSON.stringify(sampleExisting)}`);
    console.log(`SAMPLE_CREATED=${JSON.stringify(sampleCreated)}`);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error('IMPORT_ERROR:', error.message);
  process.exit(1);
});
