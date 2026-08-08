const sqlite3 = require('sqlite3').verbose();

const DB_PATH = 'database.db';
const TOP_LIMIT = 500;

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
}

function parseNumber(value) {
  if (value === null || value === undefined) return 0;
  const text = String(value).trim().toLowerCase();
  const match = text.replace(/[, ]/g, '').match(/[-+]?\d+(?:\.\d+)?/);
  if (!match) return 0;

  let number = Number(match[0]);
  if (!Number.isFinite(number)) return 0;
  if (/trillion|\bt\b/.test(text)) number *= 1_000_000;
  else if (/billion|\bb\b/.test(text)) number *= 1_000;
  else if (/thousand|\bk\b/.test(text)) number /= 1_000;
  return number;
}

function scoreEnterprise(enterprise) {
  return (
    parseNumber(enterprise.capitalization) * 1_000 +
    parseNumber(enterprise.funds_raised) * 100 +
    parseNumber(enterprise.revenue_millions) * 10 +
    parseNumber(enterprise.employees_count)
  );
}

async function main() {
  const db = new sqlite3.Database(DB_PATH);

  try {
    const rows = await all(
      db,
      `SELECT id, name, website, logo_url, capitalization, funds_raised,
              revenue_millions, employees_count
       FROM enterprises`
    );
    const top500 = rows
      .map((row) => ({ ...row, score: scoreEnterprise(row) }))
      .sort((left, right) => right.score - left.score || left.id - right.id)
      .slice(0, TOP_LIMIT);
    const missingWebsites = top500.filter(
      (enterprise) => !String(enterprise.website || '').trim()
    );
    const missingLogos = top500.filter(
      (enterprise) => !String(enterprise.logo_url || '').trim()
    );

    console.log(JSON.stringify({
      top_scope: top500.length,
      missing_websites: missingWebsites.length,
      missing_logos: missingLogos.length,
      missing_website_records: missingWebsites.map(({ id, name, logo_url, score }) => ({
        id,
        name,
        logo_url,
        score
      }))
    }, null, 2));
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});