const sqlite3 = require('sqlite3').verbose();

const APPLY = process.argv.includes('--apply');
const DB_PATH = 'database.db';

function normalizeToken(token) {
  const value = String(token || '').trim();
  if (!value) return value;

  // Si pas de parenthèse, on ne touche pas au contenu.
  if (!value.includes('(') || !value.includes(')')) {
    return value;
  }

  const match = value.match(/^([^()]+?)\s*\(\s*([^()]+?)\s*\)\s*$/);
  if (!match) {
    return value;
  }

  const company = match[1].trim();
  const scope = match[2].trim();
  return `${company}(${scope})`;
}

function normalizeCompetitors(raw) {
  if (raw === null || raw === undefined) return raw;

  const text = String(raw);
  if (!text.trim()) return text;

  // Le séparateur canonique est la virgule.
  // On ne convertit ';' que s'il sert de séparateur (ex: "A; B"),
  // afin de préserver des noms comme "tl;dv".
  const unifiedSeparators = text.replace(/\s*;\s+/g, ', ');

  const tokens = unifiedSeparators
    .split(',')
    .map((t) => normalizeToken(t))
    .filter((t) => t && t.trim().length > 0);

  return tokens.join(', ');
}

function run() {
  const db = new sqlite3.Database(DB_PATH);

  db.all(
    `SELECT id, name, main_competitors
     FROM enterprises
     WHERE main_competitors IS NOT NULL
       AND TRIM(main_competitors) <> ''
     ORDER BY id`,
    (err, rows) => {
      if (err) {
        console.error('Error reading enterprises:', err.message);
        db.close();
        process.exit(1);
        return;
      }

      const updates = [];

      for (const row of rows) {
        const normalized = normalizeCompetitors(row.main_competitors);
        if (normalized !== row.main_competitors) {
          updates.push({
            id: row.id,
            name: row.name,
            from: row.main_competitors,
            to: normalized
          });
        }
      }

      console.log(`Rows scanned: ${rows.length}`);
      console.log(`Rows to update: ${updates.length}`);
      console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);

      if (!APPLY) {
        console.log('Sample changes (first 40):');
        updates.slice(0, 40).forEach((u) => {
          console.log(`#${u.id} ${u.name}`);
          console.log(`  from: ${u.from}`);
          console.log(`  to:   ${u.to}`);
        });
        db.close();
        return;
      }

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare('UPDATE enterprises SET main_competitors = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        for (const u of updates) {
          stmt.run(u.to, u.id);
        }
        stmt.finalize();

        db.run('COMMIT', (commitErr) => {
          if (commitErr) {
            console.error('Commit failed:', commitErr.message);
            db.run('ROLLBACK');
            db.close();
            process.exit(1);
            return;
          }

          console.log(`Applied updates: ${updates.length}`);
          db.close();
        });
      });
    }
  );
}

run();
