const sqlite3 = require('sqlite3').verbose();

const APPLY = process.argv.includes('--apply');
const DB_PATH = 'database.db';
const BYTE_DANCE_VARIANT_RE = /\bbyte\s*dance\b|\bbytesdance\b|\bbytedanse\b/gi;

function normalizeCompetitors(value) {
  if (!value || typeof value !== 'string') return value;
  return value
    .split(/[,;\n|]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(BYTE_DANCE_VARIANT_RE, 'ByteDance'))
    .filter((item, index, items) => items.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index)
    .join(', ');
}

const db = new sqlite3.Database(DB_PATH);

db.all(
  `SELECT id, name, main_competitors FROM enterprises
   WHERE main_competitors IS NOT NULL
     AND (LOWER(main_competitors) LIKE '%byte%' OR LOWER(main_competitors) LIKE '%dance%')`,
  (selectError, rows) => {
    if (selectError) {
      console.error('SELECT_ERROR', selectError.message);
      db.close();
      process.exit(1);
    }

    const updates = rows
      .map((row) => ({ ...row, normalized: normalizeCompetitors(row.main_competitors) }))
      .filter((row) => row.normalized !== row.main_competitors);

    console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
    console.log(`Rows scanned: ${rows.length}`);
    console.log(`Rows to update: ${updates.length}`);
    updates.forEach((row) => {
      console.log(`#${row.id} ${row.name}`);
      console.log(`  from: ${row.main_competitors}`);
      console.log(`  to:   ${row.normalized}`);
    });

    if (!APPLY || updates.length === 0) {
      db.close();
      return;
    }

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      const statement = db.prepare('UPDATE enterprises SET main_competitors = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      updates.forEach((row) => statement.run(row.normalized, row.id));
      statement.finalize((finalizeError) => {
        if (finalizeError) {
          db.run('ROLLBACK', () => {
            console.error('UPDATE_ERROR', finalizeError.message);
            db.close();
          });
          return;
        }
        db.run('COMMIT', (commitError) => {
          if (commitError) {
            console.error('COMMIT_ERROR', commitError.message);
          }
          console.log(`Applied updates: ${updates.length}`);
          db.close();
        });
      });
    });
  }
);
