const sqlite3 = require('sqlite3').verbose();

const APPLY = process.argv.includes('--apply');
const DB_PATH = 'database.db';

const LEGAL_SUFFIX_RE = /\b(incorporated|inc|corp|corporation|company|co|llc|ltd|limited|plc|gmbh|ag|sa|sas|sasu|sarl|spa|srl|bv|nv|oy|ab|pte|kg|kgaa)\b/g;

function normalizeWhitespace(value) {
  return value.replace(/[\u00A0\u202F]/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasWeirdMixedCaseToken(name) {
  return name.split(' ').some((token) => /[A-Z]{2,}[a-z]+/.test(token) || /[a-z]+[A-Z]{2,}/.test(token));
}

function canonicalDisplayScore(name) {
  let score = 0;
  if (hasWeirdMixedCaseToken(name)) score += 50;
  if (/\([^)]*\)/.test(name)) score += 5;
  score += Math.min(name.length, 40) / 100;
  return score;
}

function repairMixedCaseToken(token) {
  if (/^[A-Z]{2,}[a-z]+$/.test(token) || /^[a-z]+[A-Z]{2,}$/.test(token)) {
    return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
  }
  return token;
}

function repairDisplayCase(name) {
  return name
    .split(' ')
    .map((token) => repairMixedCaseToken(token))
    .join(' ');
}

function normalizeKey(name) {
  // Retire le contenu entre parenthèses, les suffixes légaux et normalise.
  return name
    .replace(/['’`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(LEGAL_SUFFIX_RE, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(and|the)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '');
}

function parseCompetitorItems(value) {
  if (!value || typeof value !== 'string') {
    return [];
  }

  const items = [];
  let current = '';

  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    const next = value[i + 1] || '';

    const isComma = ch === ',';
    const isPipe = ch === '|';
    const isNewline = ch === '\n' || ch === '\r';
    // Le ';' est considéré séparateur seulement s'il est suivi d'un espace
    // (évite de casser des noms comme "tl;dv").
    const isSemicolonSeparator = ch === ';' && /\s/.test(next);

    if (isComma || isPipe || isNewline || isSemicolonSeparator) {
      const trimmed = normalizeWhitespace(current);
      if (trimmed) {
        items.push(trimmed);
      }
      current = '';
      continue;
    }

    current += ch;
  }

  const tail = normalizeWhitespace(current);
  if (tail) {
    items.push(tail);
  }

  return items;
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
        // Utilise le nom de base sans parenthèses comme forme canonique
        const baseName = repairDisplayCase(normalizeWhitespace(row.name.replace(/\s*\([^)]*\)/g, ' ')));
        const aliases = [row.name, baseName];

        aliases.forEach((alias) => {
          const key = normalizeKey(alias);
          if (!key) {
            return;
          }

          const existing = map.get(key);
          if (!existing || canonicalDisplayScore(baseName) < canonicalDisplayScore(existing)) {
            map.set(key, baseName);
          }
        });

        const legalStripped = normalizeWhitespace(baseName.replace(LEGAL_SUFFIX_RE, ' '));
        const legalStrippedKey = normalizeKey(legalStripped);
        if (legalStrippedKey && !map.has(legalStrippedKey)) {
          map.set(legalStrippedKey, baseName);
        }
      });

      resolve(map);
    });
  });
}

function normalizeCompetitorList(value, canonicalMap, focalName) {
  if (!value || typeof value !== 'string') {
    return value;
  }

  const focalKey = normalizeKey(focalName || '');
  const seen = new Set();
  const normalized = [];

  parseCompetitorItems(value).forEach((item) => {
    // Préserve le contenu entre parenthèses
    const parenMatch = item.match(/^(.+?)(\s*\(.+\))$/);
    const baseName = parenMatch ? normalizeWhitespace(parenMatch[1]) : item;
    const suffix = parenMatch ? parenMatch[2] : '';

    const key = normalizeKey(baseName);
    if (!key || key === focalKey || seen.has(key)) {
      return;
    }

    const canonical = canonicalMap.get(key);

    if (canonical) {
      normalized.push(canonical + suffix);
      seen.add(key);
      return;
    }

    normalized.push(item);
    seen.add(key);
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
          const normalized = normalizeCompetitorList(row.main_competitors, canonicalMap, row.name);
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
