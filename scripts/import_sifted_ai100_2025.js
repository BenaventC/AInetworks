const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const SOURCE_URL = 'https://sifted.eu/rankings/ai-100-2025';
const DB_PATH = path.join(__dirname, '..', 'database.db');
const APPLY = process.argv.includes('--apply');

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length ? text : null;
}

function parseYear(value) {
  if (!value) return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function canonicalName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function parseCompanies(text) {
  const rows = [];
  const regex = /Rank\s*(\d+)\s*New Company info\[[^\]]+\]\((https?:\/\/[^\)]+)\)\[([^\]]+)\]\((https?:\/\/[^\)]+)\)\s*Location\s+([^,\n]+),\s*([^\n]+?)\s+Founded\s+(\d{4})\s+Stage\s+([^\n]+?)\s+Last Round Size\s+([^\n]+?)\s+Total Funding\s+([^\n]+)/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const rank = Number.parseInt(match[1], 10);
    const website = cleanText(match[4]);
    const name = cleanText(match[3]);
    const city = cleanText(match[5]);
    const country = cleanText(match[6]);
    const foundedYear = parseYear(match[7]);
    const stage = cleanText(match[8]);
    const lastRound = cleanText(match[9]);
    const totalFunding = cleanText(match[10]);

    if (!name) continue;

    rows.push({
      rank,
      name,
      website,
      city,
      country,
      foundedYear,
      stage,
      lastRound,
      totalFunding
    });
  }

  const byName = new Map();
  for (const row of rows) {
    byName.set(canonicalName(row.name), row);
  }

  return [...byName.values()].sort((a, b) => a.rank - b.rank);
}

function fetchPage(url) {
  return fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    }
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while fetching ${url}`);
    }
    return response.text();
  });
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

async function main() {
  const pageText = await fetchPage(SOURCE_URL);
  const companies = parseCompanies(pageText);

  if (!companies.length) {
    throw new Error('No company parsed from source page. Markup may have changed.');
  }

  const db = new sqlite3.Database(DB_PATH);

  try {
    const existingRows = await all(db, 'SELECT id, name FROM enterprises');
    const existingByCanonical = new Map();

    for (const row of existingRows) {
      const key = canonicalName(row.name);
      if (key) existingByCanonical.set(key, row);
    }

    let alreadyExisting = 0;
    let missing = 0;
    let created = 0;

    const sampleExisting = [];
    const sampleCreated = [];

    for (const company of companies) {
      const key = canonicalName(company.name);
      if (!key) continue;

      if (existingByCanonical.has(key)) {
        alreadyExisting += 1;
        if (sampleExisting.length < 15) {
          sampleExisting.push(company.name);
        }
        continue;
      }

      missing += 1;

      if (!APPLY) {
        continue;
      }

      const description = cleanText(
        `Sifted AI 100 2025 ranking (#${company.rank}). Stage: ${company.stage || 'N/A'}. Last round: ${company.lastRound || 'N/A'}. Total funding: ${company.totalFunding || 'N/A'}. Source: ${SOURCE_URL}`
      );

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
          company.name,
          'Artificial Intelligence',
          'Private company',
          company.country,
          company.city,
          company.foundedYear,
          description,
          company.website,
          company.totalFunding === '-' ? null : company.totalFunding,
          3
        ]
      );

      created += 1;
      existingByCanonical.set(key, { id: -1, name: company.name });
      if (sampleCreated.length < 15) {
        sampleCreated.push(company.name);
      }
    }

    console.log(`SOURCE_COMPANIES=${companies.length}`);
    console.log(`ALREADY_IN_DB=${alreadyExisting}`);
    console.log(`MISSING_IN_DB=${missing}`);
    console.log(`APPLY_MODE=${APPLY ? 'YES' : 'NO'}`);
    console.log(`CREATED=${created}`);
    console.log(`SAMPLE_EXISTING=${JSON.stringify(sampleExisting)}`);
    console.log(`SAMPLE_CREATED=${JSON.stringify(sampleCreated)}`);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(`IMPORT_ERROR: ${error.message}`);
  process.exit(1);
});
