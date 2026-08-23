/**
 * Normalizes `enterprises.sector` against the closed referential defined in
 * public/sector_ontology.csv.
 *
 * Two modes:
 * - `--aliases-only` merges only the variants declared in `alias_terms`. Conservative,
 *   leaves already-canonical labels untouched. Use this after an import.
 * - default also applies `keyword_terms` classification, which may reassign labels
 *   that are already canonical. Reserve for deliberate reprocessing.
 *
 * Usage: node scripts/normalize_sector_labels.js [--aliases-only] [--apply]
 */

const { openDb, APPLY, withTransaction } = require('./lib/db');
const { loadOntology } = require('./lib/ontology');
const { splitList } = require('./lib/text');
const { header, preview, footer, main } = require('./lib/report');

const ALIASES_ONLY = process.argv.includes('--aliases-only');
const MAX_LABELS = 5;
const PLACEHOLDERS = new Set(['N/A', 'NA', 'N', 'A', 'NULL', 'NONE']);

const { entries, canonical, aliasToCanonical } = loadOntology();

/**
 * Extra classification rules kept in code because they express morphology
 * (word boundaries, alternatives) that the flat `keyword_terms` column cannot.
 * Everything expressible as a plain substring belongs in the CSV instead.
 */
const KEYWORD_RULES = [
  [/\bhr\b|recruit/, 'HRM'],
  [/\buav\b|drone/, 'Drone & UAV'],
  [/\bagents?\b|agentic/, 'Agentic'],
  [/\bapis?\b|inference|model serving/, 'Inference & Model Serving'],
  [/\bcx\b/, 'Customer Experience'],
  [/\bav\b|extended reality|virtual reality|augmented reality/, 'Spatial Computing'],
  [/\br&d\b|research/, 'R&D'],
  [/\bops\b/, 'Operations'],
  [/\bllms?\b|\bai\b/, 'AI model'],
  [/defen[cs]e|military/, 'Defence'],
];

/** Maps one raw label to zero or more canonical labels. */
function classify(atom) {
  const text = atom.trim();
  if (!text || PLACEHOLDERS.has(text.toUpperCase())) return [];
  if (canonical.has(text)) return [text];

  const value = text.toLowerCase();
  const alias = aliasToCanonical.get(value);
  if (alias) return [alias];
  if (ALIASES_ONLY) return [text];

  const labels = new Set();
  for (const entry of entries) {
    if (entry.keywords.some((keyword) => value.includes(keyword))) labels.add(entry.canonicalLabel);
  }
  for (const [pattern, label] of KEYWORD_RULES) {
    if (pattern.test(value)) labels.add(label);
  }
  return labels.size ? [...labels] : ['ICT'];
}

/** ICT is a fallback: it only survives when no more specific label applies. */
function normalizeSector(raw) {
  const labels = [];
  for (const atom of splitList(raw)) {
    for (const label of classify(atom)) {
      if (!labels.includes(label)) labels.push(label);
    }
  }
  const specific = labels.filter((label) => label !== 'ICT');
  const retained = specific.length ? specific : labels;
  return (ALIASES_ONLY ? retained : retained.sort()).slice(0, MAX_LABELS).join(', ') || null;
}

main(async () => {
  const db = openDb();
  const rows = await db.all('SELECT id, name, sector FROM enterprises WHERE TRIM(IFNULL(sector, "")) <> ""');

  const changes = [];
  for (const row of rows) {
    const normalized = normalizeSector(row.sector);
    if (normalized !== row.sector) changes.push({ id: row.id, name: row.name, from: row.sector, to: normalized });
  }

  header(`Normalisation des secteurs${ALIASES_ONLY ? ' (alias uniquement)' : ' (alias + mots-cles)'}`, {
    entreprises: rows.length,
    'a modifier': changes.length,
  });
  preview(changes);

  if (APPLY && changes.length) {
    await withTransaction(db, async () => {
      for (const change of changes) {
        await db.run('UPDATE enterprises SET sector = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [change.to, change.id]);
      }
    });
  }

  footer(APPLY ? changes.length : 0);
  await db.close();
});
