const sqlite3 = require('sqlite3').verbose();

const APPLY = process.argv.includes('--apply');
const DB_PATH = require('./lib/db').DB_PATH;

const FIELDS_TO_NORMALIZE = [
  'main_competitors',
  'main_investors',
  'strategic_partnerships',
  'main_acquisitions',
  'participation'
];

function normalizeKey(name) {
  return name
    .replace(/\s*\([^)]*\)/g, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '');
}

function buildCanonicalMap(db) {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, name FROM enterprises ORDER BY name', (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      const map = new Map();
      rows.forEach((row) => {
        const key = normalizeKey(row.name);
        const baseName = row.name.replace(/\s*\([^)]*\)/g, '').trim();
        if (!map.has(key)) {
          map.set(key, baseName);
        }
      });

      resolve(map);
    });
  });
}

function normalizeEntityList(value, canonicalMap) {
  if (!value || typeof value !== 'string') {
    return value;
  }

  const items = value.split(',').map((item) => item.trim()).filter(Boolean);
  const normalized = items.map((item) => {
    const parenMatch = item.match(/^(.+?)(\s*\(.+\))$/);
    const baseName = parenMatch ? parenMatch[1].trim() : item;
    const suffix = parenMatch ? parenMatch[2] : '';

    const key = normalizeKey(baseName);
    const canonical = canonicalMap.get(key);

    if (canonical) {
      return canonical + suffix;
    }

    return item;
  });

  return normalized.join(', ');
}

async function main() {
  const db = new sqlite3.Database(DB_PATH);

  console.log('Building canonical name map from enterprises table...');
  const canonicalMap = await buildCanonicalMap(db);
  console.log(`Canonical names: ${canonicalMap.size}`);

  const fieldSelectClauses = FIELDS_TO_NORMALIZE.map(field => field).join(', ');
  const sql = `SELECT id, name, ${fieldSelectClauses} FROM enterprises`;

  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      console.log(`Total enterprises: ${rows.length}`);

      const updates = [];
      rows.forEach((row) => {
        const changes = {};
        let hasChanges = false;

        FIELDS_TO_NORMALIZE.forEach((field) => {
          const original = row[field];
          if (original && original.trim() !== '') {
            const normalized = normalizeEntityList(original, canonicalMap);
            if (normalized !== original) {
              changes[field] = { from: original, to: normalized };
              hasChanges = true;
            }
          }
        });

        if (hasChanges) {
          updates.push({ id: row.id, name: row.name, changes });
        }
      });

      console.log(`Rows to update: ${updates.length}`);
      console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);

      if (updates.length > 0) {
        console.log(`\nSample changes (first ${Math.min(10, updates.length)}):`);
        updates.slice(0, 10).forEach((u) => {
          console.log(`#${u.id} ${u.name}`);
          Object.keys(u.changes).forEach((field) => {
            console.log(`  [${field}]`);
            console.log(`    from: ${u.changes[field].from}`);
            console.log(`    to:   ${u.changes[field].to}`);
          });
        });
      }

      if (APPLY && updates.length > 0) {
        let failed = null;
        let completed = 0;

        db.serialize(() => {
          db.run('BEGIN TRANSACTION');

          updates.forEach((u) => {
            const fields = Object.keys(u.changes);
            const setClauses = fields.map((field) => `${field} = ?`);
            const params = [...fields.map((field) => u.changes[field].to), u.id];
            const updateSql = `UPDATE enterprises SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

            db.run(updateSql, params, (err) => {
              if (err && !failed) failed = new Error(`#${u.id}: ${err.message}`);
              completed += 1;
              if (completed !== updates.length) return;

              db.run(failed ? 'ROLLBACK' : 'COMMIT', () => {
                if (failed) console.error(`Rollback: ${failed.message}`);
                else console.log(`\nApplied updates: ${completed}`);
                db.close(() => (failed ? reject(failed) : resolve()));
              });
            });
          });
        });
      } else {
        db.close(() => resolve());
      }
    });
  });
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
