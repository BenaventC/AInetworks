const sqlite3 = require('sqlite3').verbose();

const APPLY = process.argv.includes('--apply');
const DB_PATH = 'database.db';

const db = new sqlite3.Database(DB_PATH);

const textFields = [
  'partnership_type',
  'type_relation',
  'description',
  'start_date',
  'source',
  'sources_information',
  'infra_commitment_text',
  'status'
];

const numericFields = ['end_year', 'value_millions'];

function buildInfoExpr(columns) {
  const columnSet = new Set(columns.map((row) => row.name));
  const parts = [];

  for (const field of textFields) {
    if (columnSet.has(field)) {
      parts.push(`LENGTH(TRIM(COALESCE(${field}, '')))`);
    }
  }

  for (const field of numericFields) {
    if (columnSet.has(field)) {
      parts.push(`LENGTH(TRIM(COALESCE(CAST(${field} AS TEXT), '')))`);
    }
  }

  if (parts.length === 0) {
    return '0';
  }

  return parts.join(' + ');
}

function run() {
  db.all('PRAGMA table_info(partnerships)', (pragmaErr, columns) => {
    if (pragmaErr) {
      console.error('Schema error:', pragmaErr.message);
      db.close();
      process.exit(1);
      return;
    }

    const infoExpr = buildInfoExpr(columns);
    const countSql = `SELECT COUNT(*) AS total FROM partnerships WHERE (${infoExpr}) < 200`;
    const sampleSql = `
      SELECT id, enterprise1_id, enterprise2_id, (${infoExpr}) AS info_len, is_validated
      FROM partnerships
      WHERE (${infoExpr}) < 200
      ORDER BY info_len ASC, id ASC
      LIMIT 30
    `;
    const updateSql = `
      UPDATE partnerships
      SET is_validated = 3,
          updated_at = CURRENT_TIMESTAMP
      WHERE (${infoExpr}) < 200
    `;

    db.get(countSql, (countErr, countRow) => {
      if (countErr) {
        console.error('Count error:', countErr.message);
        db.close();
        process.exit(1);
        return;
      }

      console.log(`PARTNERSHIPS_BELOW_200=${countRow.total}`);

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
  });
}

run();
