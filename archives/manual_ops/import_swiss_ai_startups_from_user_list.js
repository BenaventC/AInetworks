const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const APPLY = process.argv.includes('--apply');
const DB_PATH = path.join(__dirname, '..', '..', 'database.db');
const SOURCE_LABEL = 'User provided Swiss AI startups list';
const SOURCE_DATE = '2026-08-07';

const STARTUPS = [
  { name: 'Axelera AI', fundsRaisedMUsd: 200, linkedin: 'https://www.linkedin.com/company/axelera-ai/' },
  { name: 'Cradle', fundsRaisedMUsd: 103, linkedin: 'https://www.linkedin.com/company/cradlebio/' },
  { name: 'Unique', fundsRaisedMUsd: 52, linkedin: 'https://www.linkedin.com/company/unique-zurich/' },
  { name: 'Crescendo', fundsRaisedMUsd: 50, linkedin: 'https://www.linkedin.com/company/crescendocx/' },
  { name: 'Hedera Dx', fundsRaisedMUsd: 35, linkedin: 'https://www.linkedin.com/company/hedera-dx/' },
  { name: 'Lakera', fundsRaisedMUsd: 30, linkedin: 'https://www.linkedin.com/company/checkpointaisecurity/' },
  { name: 'Jua.ai', fundsRaisedMUsd: 27, linkedin: 'https://www.linkedin.com/company/juaai/' },
  { name: 'EthonAI', fundsRaisedMUsd: 24, linkedin: 'https://www.linkedin.com/company/ethonai/' },
  { name: 'RIVR', fundsRaisedMUsd: 20, linkedin: 'https://www.linkedin.com/company/rivr-technologies/' },
  { name: 'Browser Use', fundsRaisedMUsd: 17, linkedin: 'https://www.linkedin.com/company/browser-use/' },
  { name: 'LatticeFlow AI', fundsRaisedMUsd: 14, linkedin: 'https://www.linkedin.com/company/latticeflowai/' },
  { name: 'DeepJudge', fundsRaisedMUsd: 11, linkedin: 'https://www.linkedin.com/company/deepjudge/' }
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

async function main() {
  const db = new sqlite3.Database(DB_PATH);

  try {
    const existingRows = await all(
      db,
      `SELECT id, name, country, sector, organization_type, website, description, funds_raised, is_validated
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
      websiteSet: 0,
      conflictsCountry: 0
    };

    for (const item of STARTUPS) {
      const key = canonicalName(item.name);
      if (!key) continue;

      const targetFunds = normalizeFundsOutput(item.fundsRaisedMUsd);
      const existing = existingByKey.get(key);

      if (!existing) {
        if (APPLY) {
          const description = `${SOURCE_LABEL} (${SOURCE_DATE}). Funds raised reported: ${item.fundsRaisedMUsd} MUSD.`;
          await run(
            db,
            `INSERT INTO enterprises (
              name,
              sector,
              organization_type,
              country,
              website,
              description,
              funds_raised,
              is_validated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.name,
              'Artificial Intelligence',
              'Private company',
              'Switzerland',
              item.linkedin,
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
      const incomingFunds = parseMillions(item.fundsRaisedMUsd);
      if (
        Number.isFinite(incomingFunds) &&
        (!Number.isFinite(existingFunds) || incomingFunds > existingFunds)
      ) {
        updates.push('funds_raised = ?');
        params.push(normalizeFundsOutput(incomingFunds));
        stats.fundsUpdated += 1;
      }

      const country = String(existing.country || '').trim();
      if (!country) {
        updates.push('country = ?');
        params.push('Switzerland');
        stats.countryFixed += 1;
      } else if (country.toLowerCase() !== 'switzerland') {
        stats.conflictsCountry += 1;
      }

      const website = String(existing.website || '').trim();
      if (!website) {
        updates.push('website = ?');
        params.push(item.linkedin);
        stats.websiteSet += 1;
      }

      const sector = String(existing.sector || '').trim();
      if (!sector) {
        updates.push('sector = ?');
        params.push('Artificial Intelligence');
      }

      const orgType = String(existing.organization_type || '').trim();
      if (!orgType) {
        updates.push('organization_type = ?');
        params.push('Private company');
      }

      const description = String(existing.description || '').trim();
      if (!description) {
        updates.push('description = ?');
        params.push(`${SOURCE_LABEL} (${SOURCE_DATE}). Funds raised reported: ${item.fundsRaisedMUsd} MUSD.`);
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
    console.log(`WEBSITE_SET=${stats.websiteSet}`);
    console.log(`COUNTRY_CONFLICTS=${stats.conflictsCountry}`);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error('IMPORT_ERROR:', error.message);
  process.exit(1);
});
