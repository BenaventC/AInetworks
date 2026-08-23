/**
 * Apply web research results to the 81 enterprises imported from the CB Insights
 * "most promising AI startups 2026" list.
 *
 * Scope is strictly limited to records created by scripts/import_cbinsights_ai100_2026.js
 * (is_validated = 3 and description containing "CB Insights"). For those records the
 * placeholder values written at import time are replaced by the researched values;
 * unverified fields stay NULL.
 *
 * Usage:
 *   node scripts/apply_cbinsights_ai100_2026_research.js           # preview
 *   node scripts/apply_cbinsights_ai100_2026_research.js --apply   # write
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const APPLY = process.argv.includes('--apply');
const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'database.db');
const RESEARCH_DIR = path.join(ROOT, 'exports', 'research');

const TEXT_FIELDS = ['website', 'country', 'headquarter_city', 'main_investors', 'description'];
const NUM_FIELDS = ['founded_year', 'funds_raised', 'employees_count'];

function loadResearch() {
  const byName = new Map();
  for (const file of fs.readdirSync(RESEARCH_DIR).filter((f) => /^cb2026_batch_\d+\.json$/.test(f))) {
    for (const rec of JSON.parse(fs.readFileSync(path.join(RESEARCH_DIR, file), 'utf8'))) {
      byName.set(rec.input_name, { ...rec, _file: file });
    }
  }
  return byName;
}

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s || /^(na|n\/a|null|unknown|none)$/i.test(s)) return null;
  return s;
}

function cleanNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildDescription(rec, cbCategory) {
  const body = cleanText(rec.description);
  if (!body) return null;
  const provenance = `Listed by CB Insights among the most promising AI startups for 2026${cbCategory ? ` (category: ${cbCategory})` : ''}.`;
  return `${body}\n${provenance}`;
}

// Recover the CB Insights category kept in the description written at import time.
function extractCategory(description) {
  const m = /category "([^"]+)"/.exec(description || '');
  return m ? m[1] : null;
}

const db = new sqlite3.Database(DB_PATH);
const all = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => (e ? rej(e) : res(r))));
const run = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { return e ? rej(e) : res(this); }));

(async () => {
  const research = loadResearch();
  const rows = await all(
    "SELECT * FROM enterprises WHERE is_validated = 3 AND description LIKE '%CB Insights%' ORDER BY id"
  );

  const audit = [];
  const updates = [];

  for (const row of rows) {
    const rec = research.get(row.name);
    if (!rec) {
      audit.push({ name: row.name, id: row.id, decision: 'no_research', fields: [] });
      continue;
    }

    const category = extractCategory(row.description);
    const candidate = {
      website: cleanText(rec.website),
      country: cleanText(rec.country),
      headquarter_city: cleanText(rec.headquarter_city),
      main_investors: cleanText(rec.main_investors),
      description: buildDescription(rec, category),
      founded_year: cleanNumber(rec.founded_year),
      funds_raised: cleanNumber(rec.funds_raised),
      employees_count: cleanNumber(rec.employees_count),
    };

    const setFields = {};
    for (const f of [...TEXT_FIELDS, ...NUM_FIELDS]) {
      const value = candidate[f];
      if (value === null) continue;           // never erase with an unverified value
      if (String(row[f] ?? '') === String(value)) continue;
      setFields[f] = value;
    }

    if (!Object.keys(setFields).length) {
      audit.push({ name: row.name, id: row.id, decision: 'unchanged', fields: [] });
      continue;
    }

    updates.push({ id: row.id, name: row.name, setFields });
    audit.push({ name: row.name, id: row.id, decision: 'updated', fields: Object.keys(setFields), source_file: rec._file });
  }

  const counts = audit.reduce((acc, a) => ({ ...acc, [a.decision]: (acc[a.decision] || 0) + 1 }), {});
  console.log(`Base: ${DB_PATH}`);
  console.log(`Fiches CB Insights 2026 en base: ${rows.length}`);
  console.log('Décisions:', counts);
  for (const u of updates) {
    console.log(`  #${u.id} ${u.name} -> ${u.fields ? '' : ''}${Object.keys(u.setFields).join(', ')}`);
  }
  const noResearch = audit.filter((a) => a.decision === 'no_research');
  if (noResearch.length) console.log('\nSans recherche:', noResearch.map((a) => a.name).join(', '));

  if (APPLY && updates.length) {
    await run('BEGIN TRANSACTION');
    try {
      for (const u of updates) {
        const keys = Object.keys(u.setFields);
        const sql = `UPDATE enterprises SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        await run(sql, [...keys.map((k) => u.setFields[k]), u.id]);
      }
      await run('COMMIT');
      console.log(`\n✓ ${updates.length} fiches mises à jour.`);
    } catch (e) {
      await run('ROLLBACK');
      console.error('Rollback:', e.message);
      process.exitCode = 1;
    }
  } else if (!APPLY) {
    console.log('\n(Mode aperçu — relancer avec --apply pour écrire.)');
  }

  const outPath = path.join(ROOT, 'exports', 'cbinsights_ai100_2026_enrichment_audit.json');
  fs.writeFileSync(outPath, JSON.stringify({ applied: APPLY, consulted_at: '2026-08-23', counts, audit }, null, 2), 'utf8');
  console.log(`Audit: ${outPath}`);

  db.close();
})();
