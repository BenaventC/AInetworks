const sqlite3 = require('sqlite3').verbose();

const APPLY = process.argv.includes('--apply');
const DB_PATH = 'database.db';

const infoExpr = `
  LENGTH(TRIM(COALESCE(headquarter_city, ''))) +
  LENGTH(TRIM(COALESCE(CAST(founded_year AS TEXT), ''))) +
  LENGTH(TRIM(COALESCE(description, ''))) +
  LENGTH(TRIM(COALESCE(website, ''))) +
  LENGTH(TRIM(COALESCE(logo_url, ''))) +
  LENGTH(TRIM(COALESCE(capitalization, ''))) +
  LENGTH(TRIM(COALESCE(funds_raised, ''))) +
  LENGTH(TRIM(COALESCE(CAST(revenue_millions AS TEXT), ''))) +
  LENGTH(TRIM(COALESCE(CAST(employees_count AS TEXT), ''))) +
  LENGTH(TRIM(COALESCE(main_investors, ''))) +
  LENGTH(TRIM(COALESCE(main_competitors, ''))) +
  LENGTH(TRIM(COALESCE(main_acquisitions, ''))) +
  LENGTH(TRIM(COALESCE(key_resources, ''))) +
  LENGTH(TRIM(COALESCE(strategic_partnerships, '')))
`;

const db = new sqlite3.Database(DB_PATH);

const countSql = `SELECT COUNT(*) AS total FROM enterprises WHERE (${infoExpr}) < 200`;
const sampleSql = `
  SELECT id, name, (${infoExpr}) AS info_len, is_validated
  FROM enterprises
  WHERE (${infoExpr}) < 200
  ORDER BY info_len ASC, id ASC
  LIMIT 30
`;
const updateSql = `
  UPDATE enterprises
  SET is_validated = 3,
      updated_at = CURRENT_TIMESTAMP
  WHERE (${infoExpr}) < 200
`;

function run() {
  db.get(countSql, (countErr, countRow) => {
    if (countErr) {
      console.error('Count error:', countErr.message);
      db.close();
      process.exit(1);
      return;
    }

    console.log(`ENTERPRISES_BELOW_200=${countRow.total}`);

    db.all(sampleSql, (sampleErr, sampleRows) => {
      if (sampleErr) {
        console.error('Sample error:', sampleErr.message);
        db.close();
        process.exit(1);
        return;
      }

      console.log('SAMPLE (first 30)');
      console.log(JSON.stringify(sampleRows, null, 2));

      if (!APPLY) {
        console.log('Mode: DRY RUN');
        db.close();
        return;
      }

      db.run(updateSql, function updateDone(updateErr) {
        if (updateErr) {
          console.error('Update error:', updateErr.message);
          db.close();
          process.exit(1);
          return;
        }

        console.log(`UPDATED_ROWS=${this.changes}`);
        db.close();
      });
    });
  });
}

run();
