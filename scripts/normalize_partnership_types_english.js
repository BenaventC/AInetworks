const sqlite3 = require('sqlite3').verbose();

const APPLY = process.argv.includes('--apply');
const DB_PATH = require('./lib/db').DB_PATH;

const TOKEN_MAP = new Map([
  ['investissement', 'Investment'],
  ['partenariat technologique', 'Technology Partnership'],
  ['autre', 'Other'],
  ['acquisition', 'Acquisition / Integration'],
  ['integration', 'Acquisition / Integration'],
  ['partnership', 'Partnership']
]);

function normalizeToken(raw) {
  if (!raw) return null;

  const token = String(raw).trim();
  if (!token) return null;

  const normalized = token
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return TOKEN_MAP.get(normalized) || token;
}

function normalizePartnershipType(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const normalizedTokens = text
    .split(',')
    .map((part) => normalizeToken(part))
    .filter(Boolean);

  const unique = [];
  const seen = new Set();
  for (const token of normalizedTokens) {
    if (seen.has(token)) continue;
    seen.add(token);
    unique.push(token);
  }

  return unique.join(', ');
}

function run() {
  const db = new sqlite3.Database(DB_PATH);

  db.all('SELECT id, partnership_type FROM partnerships ORDER BY id', (err, rows) => {
    if (err) {
      console.error('Error while reading partnerships:', err.message);
      db.close();
      process.exit(1);
      return;
    }

    const updates = [];
    for (const row of rows) {
      const current = row.partnership_type === null || row.partnership_type === undefined
        ? null
        : String(row.partnership_type).trim() || null;
      const normalized = normalizePartnershipType(current);
      if (normalized !== current) {
        updates.push({ id: row.id, from: current, to: normalized });
      }
    }

    console.log(`Total relationships: ${rows.length}`);
    console.log(`Rows to update: ${updates.length}`);
    console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);

    if (!APPLY) {
      console.log('Sample changes (first 30):');
      updates.slice(0, 30).forEach((u) => {
        console.log(`#${u.id}`);
        console.log(`  FROM: ${u.from || '<empty>'}`);
        console.log(`  TO  : ${u.to || '<empty>'}`);
      });
      db.close();
      return;
    }

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      const stmt = db.prepare('UPDATE partnerships SET partnership_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      updates.forEach((u) => stmt.run(u.to, u.id));
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
  });
}

run();
