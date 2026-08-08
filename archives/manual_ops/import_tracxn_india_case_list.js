const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const APPLY = process.argv.includes('--apply');
const DB_PATH = path.join(__dirname, '..', '..', 'database.db');
const SOURCE_LABEL = 'User provided Tracxn AI startups list (India case)';
const SOURCE_DATE = '2026-08-07';

const STARTUPS = [
  {
    name: 'Innovaccer',
    description: 'Developer of healthcare data platforms and artificial intelligence agent software',
    city: 'San Francisco',
    country: 'United States',
    foundedYear: 2014,
    stage: 'Series F',
    status: null,
    fundsRaisedMUsd: 675,
    website: 'https://tracxn.com/d/companies/innovaccer/__kvvAjPIPvTlVwOCbNE3GkPNS2Tz7KWqwz_0u2KIOmaA'
  },
  {
    name: 'NextBillion AI',
    description: 'Provider of an AI-powered mapping platform',
    city: 'Singapore',
    country: 'Singapore',
    foundedYear: 2020,
    stage: 'Acquired',
    status: 'Acquired',
    fundsRaisedMUsd: 34.2,
    website: 'https://tracxn.com/d/companies/nextbillion-ai/__KANZ8KDgH7EEJE6RnfoCBXJov2bfhN95vlYyYYiEt6Q'
  },
  {
    name: 'Netcore Cloud',
    description: 'Provider of an AI-powered platform for customer engagement and marketing',
    city: 'Mumbai',
    country: 'India',
    foundedYear: 1998,
    stage: 'Early Stage',
    status: null,
    fundsRaisedMUsd: 4.89,
    website: 'https://tracxn.com/d/companies/netcore-cloud/__CUpd4xg4WwskUnl7f7GuehNDJStuNvmWkLtwaiP7C38'
  },
  {
    name: 'Sarvam',
    description: 'Developer of artificial intelligence models for speech and document processing',
    city: 'Bengaluru',
    country: 'India',
    foundedYear: 2023,
    stage: 'Series B',
    status: null,
    fundsRaisedMUsd: 275,
    website: 'https://tracxn.com/d/companies/sarvam/__pdMzZ7Rkxe_acM5ctqBwOaZ9aoqOdLTKSvAsHq-7kFw'
  },
  {
    name: 'CommerceIQ',
    description: 'Provider of unified AI platform for retail ecommerce sales and optimization',
    city: 'Mountain View',
    country: 'United States',
    foundedYear: 2012,
    stage: 'Series D',
    status: null,
    fundsRaisedMUsd: 196,
    website: 'https://tracxn.com/d/companies/commerceiq/__lGkXNU8D9DAA8F7r4OBYXezGKjb35G7NS56fQKAykr8'
  }
];

function canonicalName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function parseMillions(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  let s = String(value).trim();
  if (!s) return null;

  s = s.replace(/\u00A0/g, ' ');
  s = s.replace(/\$/g, '');
  s = s.replace(/usd|eur|million|millions|m\b/gi, '');
  s = s.replace(/,/g, '.');

  const match = s.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  const n = Number.parseFloat(match[0]);
  return Number.isFinite(n) ? n : null;
}

function normalizeFundsOutput(millions) {
  if (!Number.isFinite(millions) || millions <= 0) return null;
  return String(Number(millions.toFixed(3)).toString());
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

function makeConflictMarker(currentCountry, expectedCountry) {
  return `[REVIEW_COUNTRY] Country value kept as-is (${currentCountry}); source list expects ${expectedCountry} and requires later verification.`;
}

async function main() {
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
         company_status,
         sector,
         organization_type,
         website,
         description,
         funds_raised,
         is_validated
       FROM enterprises`
    );

    const existingByKey = new Map();
    for (const row of existingRows) {
      const key = canonicalName(row.name);
      if (key && !existingByKey.has(key)) {
        existingByKey.set(key, row);
      }
    }

    const stats = {
      sourceCount: STARTUPS.length,
      found: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      fundsUpdated: 0,
      countryFixed: 0,
      cityFixed: 0,
      foundedFixed: 0,
      statusFixed: 0,
      websiteSet: 0,
      descriptionSet: 0,
      countryConflicts: 0,
      countryMarkersAdded: 0
    };

    for (const item of STARTUPS) {
      const key = canonicalName(item.name);
      if (!key) continue;

      const existing = existingByKey.get(key);
      const incomingFunds = parseMillions(item.fundsRaisedMUsd);
      const targetFunds = normalizeFundsOutput(incomingFunds);

      if (!existing) {
        if (APPLY) {
          const description = `${item.description}. ${SOURCE_LABEL} (${SOURCE_DATE}). Stage: ${item.stage}. Funds raised reported: ${item.fundsRaisedMUsd} MUSD.`;
          await run(
            db,
            `INSERT INTO enterprises (
              name,
              sector,
              organization_type,
              country,
              headquarter_city,
              founded_year,
              company_status,
              website,
              description,
              funds_raised,
              is_validated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.name,
              'Artificial Intelligence',
              'Private company',
              item.country || 'NA',
              item.city || 'NA',
              Number.isFinite(Number(item.foundedYear)) ? Number(item.foundedYear) : null,
              item.status,
              item.website,
              description,
              targetFunds,
              3
            ]
          );
        }

        stats.created += 1;
        continue;
      }

      stats.found += 1;

      const updates = [];
      const params = [];

      const existingFunds = parseMillions(existing.funds_raised);
      if (
        Number.isFinite(incomingFunds) &&
        (!Number.isFinite(existingFunds) || incomingFunds > existingFunds)
      ) {
        updates.push('funds_raised = ?');
        params.push(targetFunds);
        stats.fundsUpdated += 1;
      }

      const existingCountry = String(existing.country || '').trim();
      const targetCountry = String(item.country || '').trim();
      if (!existingCountry && targetCountry) {
        updates.push('country = ?');
        params.push(targetCountry);
        stats.countryFixed += 1;
      } else if (existingCountry && targetCountry && existingCountry.toLowerCase() !== targetCountry.toLowerCase()) {
        stats.countryConflicts += 1;
        const marker = makeConflictMarker(existingCountry, targetCountry);
        const existingDesc = String(existing.description || '').trim();
        if (!existingDesc.includes(marker)) {
          updates.push('description = ?');
          params.push(existingDesc ? `${existingDesc}\n\n${marker}` : marker);
          stats.countryMarkersAdded += 1;
        }
      }

      const existingCity = String(existing.headquarter_city || '').trim();
      if (!existingCity && item.city) {
        updates.push('headquarter_city = ?');
        params.push(item.city);
        stats.cityFixed += 1;
      }

      const existingFounded = Number(existing.founded_year);
      if ((!Number.isFinite(existingFounded) || existingFounded <= 0) && Number.isFinite(Number(item.foundedYear))) {
        updates.push('founded_year = ?');
        params.push(Number(item.foundedYear));
        stats.foundedFixed += 1;
      }

      const existingStatus = String(existing.company_status || '').trim();
      if (!existingStatus && item.status) {
        updates.push('company_status = ?');
        params.push(item.status);
        stats.statusFixed += 1;
      }

      const existingWebsite = String(existing.website || '').trim();
      if (!existingWebsite && item.website) {
        updates.push('website = ?');
        params.push(item.website);
        stats.websiteSet += 1;
      }

      const existingDescription = String(existing.description || '').trim();
      if (!existingDescription && item.description) {
        updates.push('description = ?');
        params.push(`${item.description}. ${SOURCE_LABEL} (${SOURCE_DATE}). Stage: ${item.stage}. Funds raised reported: ${item.fundsRaisedMUsd} MUSD.`);
        stats.descriptionSet += 1;
      }

      const existingSector = String(existing.sector || '').trim();
      if (!existingSector) {
        updates.push('sector = ?');
        params.push('Artificial Intelligence');
      }

      const existingOrgType = String(existing.organization_type || '').trim();
      if (!existingOrgType) {
        updates.push('organization_type = ?');
        params.push('Private company');
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
        stats.updated += 1;
      } else {
        stats.unchanged += 1;
      }
    }

    console.log(`APPLY_MODE=${APPLY ? 'YES' : 'NO'}`);
    console.log(`SOURCE_COUNT=${stats.sourceCount}`);
    console.log(`FOUND_EXISTING=${stats.found}`);
    console.log(`CREATED=${stats.created}`);
    console.log(`UPDATED=${stats.updated}`);
    console.log(`UNCHANGED=${stats.unchanged}`);
    console.log(`FUNDS_UPDATED=${stats.fundsUpdated}`);
    console.log(`COUNTRY_FIXED=${stats.countryFixed}`);
    console.log(`CITY_FIXED=${stats.cityFixed}`);
    console.log(`FOUNDED_FIXED=${stats.foundedFixed}`);
    console.log(`STATUS_FIXED=${stats.statusFixed}`);
    console.log(`WEBSITE_SET=${stats.websiteSet}`);
    console.log(`DESCRIPTION_SET=${stats.descriptionSet}`);
    console.log(`COUNTRY_CONFLICTS=${stats.countryConflicts}`);
    console.log(`COUNTRY_MARKERS_ADDED=${stats.countryMarkersAdded}`);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error('IMPORT_ERROR:', error.message);
  process.exit(1);
});
