const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const APPLY = process.argv.includes('--apply');
const DB_PATH = path.join(__dirname, '..', '..', 'database.db');
const SOURCE_LABEL = 'User provided Polish AI startups list';
const SOURCE_DATE = '2026-08-07';
const COUNTRY_TARGET = 'Poland';

const STARTUPS = [
  {
    name: 'Nomagic',
    fundsRaisedMUsd: 84.1,
    city: 'Warsaw',
    foundedYear: 2017,
    stage: 'Series B',
    status: null,
    website: 'https://tracxn.com/d/companies/nomagic/__DS67IQR0V9o5wKN8saixw1fX6b0btrGFSl3TRcwuoCE',
    description: 'Developer of artificial intelligence-powered robotic solutions for warehouse automation'
  },
  {
    name: 'SalesManago',
    fundsRaisedMUsd: 7.7,
    city: 'Krakow',
    foundedYear: 2008,
    stage: 'Acquired',
    status: 'Acquired',
    website: 'https://tracxn.com/d/companies/salesmanago/__apA9TNviezFC08qubPyjuaHFBgt0zoPCewxcCg7j0TI',
    description: 'Developer of a lifecycle engagement platform providing marketing and sales automation'
  },
  {
    name: 'Synerise',
    fundsRaisedMUsd: 31.5,
    city: 'Krakow',
    foundedYear: 2013,
    stage: 'Series B',
    status: null,
    website: 'https://tracxn.com/d/companies/synerise/__6v_cnrSsoNTKzPPfkgzrWV_YolH6Az86LPUhKwZVxKs',
    description: 'AI based sales and marketing alignment and automation platform'
  },
  {
    name: 'Ingenix.ai',
    fundsRaisedMUsd: 25,
    city: 'Warsaw',
    foundedYear: 2023,
    stage: 'Seed',
    status: null,
    website: 'https://tracxn.com/d/companies/ingenixai/__JoiWtJ95nKlfWo0TA8EUG26fKiXG6bj8VcSG5UKn4q0',
    description: 'Provider of AI-powered clinical trial simulation'
  },
  {
    name: 'Tidio',
    fundsRaisedMUsd: 26.8,
    city: 'Szczecin',
    foundedYear: 2013,
    stage: 'Series B',
    status: null,
    website: 'https://tracxn.com/d/companies/tidio/__DZdr3Dr0qroXCNzKiyjAX2B36HUau5O2i0sgrKdLIvc',
    description: 'Platform offering AI customer experience software'
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

function makeConflictMarker(currentCountry) {
  return `[REVIEW_COUNTRY] Country value kept as-is (${currentCountry}); user-provided Poland startup list requires later verification.`;
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
              COUNTRY_TARGET,
              item.city || null,
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
      if (!existingCountry) {
        updates.push('country = ?');
        params.push(COUNTRY_TARGET);
        stats.countryFixed += 1;
      } else if (existingCountry.toLowerCase() !== COUNTRY_TARGET.toLowerCase()) {
        stats.countryConflicts += 1;
        const marker = makeConflictMarker(existingCountry);
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
