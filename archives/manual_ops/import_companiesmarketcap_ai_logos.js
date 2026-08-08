const https = require('https');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const APPLY = process.argv.includes('--apply');
const OVERWRITE = process.argv.includes('--overwrite');

const DB_PATH = path.join(__dirname, '..', '..', 'database.db');
const SOURCE_LABEL = 'CompaniesMarketCap AI ranking';
const SOURCE_DATE = '2026-08-07';
const SOURCE_URL = 'https://companiesmarketcap.com/fr/intelligence-artificielle/plus-grandes-entreprises-ia-par-capitalisation-boursiere/';
const SOURCE_HOST = 'https://companiesmarketcap.com';

function canonicalName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function isMissingText(value) {
  const s = String(value ?? '').trim();
  if (!s) return true;
  return ['na', 'n/a', 'null', 'none', 'unknown', 'undefined'].includes(s.toLowerCase());
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

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          accept: 'text/html,application/xhtml+xml'
        }
      },
      (res) => {
        const code = res.statusCode || 0;

        if (code >= 300 && code < 400 && res.headers.location) {
          res.resume();
          const nextUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : SOURCE_HOST + res.headers.location;
          resolve(fetchHtml(nextUrl));
          return;
        }

        if (code < 200 || code >= 300) {
          res.resume();
          reject(new Error(`HTTP ${code} while fetching source`));
          return;
        }

        let html = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          html += chunk;
        });
        res.on('end', () => resolve(html));
      }
    );

    req.setTimeout(30000, () => {
      req.destroy(new Error('HTTP request timed out after 30s'));
    });

    req.on('error', reject);
  });
}

function getAttr(tag, attrName) {
  const re = new RegExp(`${attrName}\\s*=\\s*"([^"]+)"`, 'i');
  const m = tag.match(re);
  return m ? m[1].trim() : null;
}

function normalizeLogoUrl(raw) {
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  if (raw.startsWith('/')) return `${SOURCE_HOST}${raw}`;
  return `${SOURCE_HOST}/${raw.replace(/^\/+/, '')}`;
}

function extractNameVariants(sourceName) {
  const variants = new Set();

  const add = (v) => {
    const key = canonicalName(v);
    if (key) variants.add(key);
  };

  add(sourceName);

  const noParens = sourceName.replace(/\s*\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  add(noParens);

  const parens = [...sourceName.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]);
  for (const content of parens) {
    const cleaned = content.replace(/\b(the|inc|corp|corporation|company|holdings?)\b/gi, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned.length >= 3) add(cleaned);

    for (const part of content.split(/[\/,;|]|\bor\b/gi)) {
      const p = part.trim();
      if (p.length >= 3) add(p);
    }
  }

  return [...variants];
}

function parseLogosFromHtml(html) {
  const tags = html.match(/<img[^>]*class="company-logo"[^>]*>/gi) || [];
  const byName = new Map();

  for (const tag of tags) {
    const alt = getAttr(tag, 'alt');
    const src = getAttr(tag, 'src');
    if (!alt || !src) continue;

    const sourceName = alt.replace(/\s*logo\s*$/i, '').replace(/\s+/g, ' ').trim();
    const logoUrl = normalizeLogoUrl(src);
    if (!sourceName || !logoUrl) continue;

    const key = canonicalName(sourceName);
    if (!key || byName.has(key)) continue;

    byName.set(key, { sourceName, logoUrl });
  }

  return [...byName.values()];
}

async function main() {
  const html = await fetchHtml(SOURCE_URL);
  const sourceRows = parseLogosFromHtml(html);

  const db = new sqlite3.Database(DB_PATH);

  try {
    const existingRows = await all(db, 'SELECT id, name, logo_url FROM enterprises');

    const existingByKey = new Map();
    for (const row of existingRows) {
      const key = canonicalName(row.name);
      if (!key) continue;
      if (!existingByKey.has(key)) existingByKey.set(key, []);
      existingByKey.get(key).push(row);
    }

    const stats = {
      applyMode: APPLY,
      overwriteMode: OVERWRITE,
      sourceCompanies: sourceRows.length,
      dbRows: existingRows.length,
      matched: 0,
      ambiguous: 0,
      notFoundInDb: 0,
      updated: 0,
      skippedHasLogo: 0,
      unchangedSameLogo: 0
    };

    const unmatchedSamples = [];
    const ambiguousSamples = [];
    const updatedSamples = [];

    for (const source of sourceRows) {
      const variantKeys = extractNameVariants(source.sourceName);

      const candidates = [];
      const seenIds = new Set();
      for (const key of variantKeys) {
        const rows = existingByKey.get(key) || [];
        for (const row of rows) {
          if (!seenIds.has(row.id)) {
            seenIds.add(row.id);
            candidates.push(row);
          }
        }
      }

      if (candidates.length === 0) {
        stats.notFoundInDb += 1;
        if (unmatchedSamples.length < 15) {
          unmatchedSamples.push(source.sourceName);
        }
        continue;
      }

      if (candidates.length > 1) {
        stats.ambiguous += 1;
        if (ambiguousSamples.length < 10) {
          ambiguousSamples.push(`${source.sourceName} -> ${candidates.map((c) => c.name).join(' | ')}`);
        }
        continue;
      }

      stats.matched += 1;
      const target = candidates[0];
      const currentLogo = String(target.logo_url || '').trim();
      const nextLogo = source.logoUrl;

      if (!OVERWRITE && !isMissingText(currentLogo)) {
        if (currentLogo === nextLogo) stats.unchangedSameLogo += 1;
        else stats.skippedHasLogo += 1;
        continue;
      }

      if (currentLogo === nextLogo) {
        stats.unchangedSameLogo += 1;
        continue;
      }

      if (APPLY) {
        await run(
          db,
          `UPDATE enterprises
             SET logo_url = ?,
                 updated_at = datetime('now')
           WHERE id = ?`,
          [nextLogo, target.id]
        );
      }

      stats.updated += 1;
      if (updatedSamples.length < 20) {
        updatedSamples.push(`${target.name} <= ${nextLogo}`);
      }
    }

    console.log(`APPLY_MODE=${stats.applyMode ? 'YES' : 'NO'}`);
    console.log(`OVERWRITE_MODE=${stats.overwriteMode ? 'YES' : 'NO'}`);
    console.log(`SOURCE_LABEL=${SOURCE_LABEL}`);
    console.log(`SOURCE_DATE=${SOURCE_DATE}`);
    console.log(`SOURCE_COMPANIES=${stats.sourceCompanies}`);
    console.log(`DB_ROWS=${stats.dbRows}`);
    console.log(`MATCHED=${stats.matched}`);
    console.log(`UPDATED=${stats.updated}`);
    console.log(`SKIPPED_HAS_LOGO=${stats.skippedHasLogo}`);
    console.log(`UNCHANGED_SAME_LOGO=${stats.unchangedSameLogo}`);
    console.log(`NOT_FOUND_IN_DB=${stats.notFoundInDb}`);
    console.log(`AMBIGUOUS_MATCHES=${stats.ambiguous}`);

    if (updatedSamples.length) {
      console.log('\nUPDATED_SAMPLES');
      for (const line of updatedSamples) console.log(`- ${line}`);
    }

    if (unmatchedSamples.length) {
      console.log('\nUNMATCHED_SAMPLES');
      for (const line of unmatchedSamples) console.log(`- ${line}`);
    }

    if (ambiguousSamples.length) {
      console.log('\nAMBIGUOUS_SAMPLES');
      for (const line of ambiguousSamples) console.log(`- ${line}`);
    }
  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error('FAILED:', err.message || err);
  process.exit(1);
});
