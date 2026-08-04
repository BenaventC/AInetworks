const sqlite3 = require('sqlite3').verbose();

const APPLY = process.argv.includes('--apply');
const DB_PATH = 'database.db';

function normalizeKey(name) {
  // Retire le contenu entre parenthèses et normalise
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
        // Utilise le nom de base sans parenthèses comme forme canonique
        const baseName = row.name.replace(/\s*\([^)]*\)/g, '').trim();
        if (!map.has(key)) {
          map.set(key, baseName);
        }
      });

      resolve(map);
    });
  });
}

function normalizeCompetitorList(value, canonicalMap) {
  if (!value || typeof value !== 'string') {
    return value;
  }

  const items = value.split(',').map((item) => item.trim()).filter(Boolean);
  const normalized = items.map((item) => {
    // Préserve le contenu entre parenthèses
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

  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, name, main_competitors FROM enterprises WHERE main_competitors IS NOT NULL AND TRIM(main_competitors) != ""',
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`Total enterprises with competitors: ${rows.length}`);

        const updates = [];
        rows.forEach((row) => {
          const normalized = normalizeCompetitorList(row.main_competitors, canonicalMap);
          if (normalized !== row.main_competitors) {
            updates.push({ id: row.id, name: row.name, from: row.main_competitors, to: normalized });
          }
        });

        console.log(`Rows to update: ${updates.length}`);
        console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);

        if (updates.length > 0) {
          console.log(`\nSample changes (first ${Math.min(20, updates.length)}):`);
          updates.slice(0, 20).forEach((u) => {
            console.log(`#${u.id} ${u.name}`);
            console.log(`  from: ${u.from}`);
            console.log(`  to:   ${u.to}`);
          });
        }

        if (APPLY && updates.length > 0) {
          let completed = 0;
          const stmt = db.prepare('UPDATE enterprises SET main_competitors = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');

          updates.forEach((u) => {
            stmt.run([u.to, u.id], (err) => {
              if (err) {
                console.error(`Error updating #${u.id}:`, err.message);
              }
              completed++;
              if (completed === updates.length) {
                stmt.finalize();
                console.log(`\nApplied updates: ${completed}`);
                db.close(() => resolve());
              }
            });
          });
        } else {
          db.close(() => resolve());
        }
      }
    );
  });
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
