/**
 * Read-only inventory of the `sector` labels in use, with detection of
 * morphological variants (case, accents, punctuation, plurals, "&" / "and").
 *
 * Usage: node scripts/audit_sector_label_variants.js [--min N]
 */

const { openDb } = require('./lib/db');
const { loadOntology } = require('./lib/ontology');
const { stripDiacritics } = require('./lib/text');
const { header, writeAudit, main } = require('./lib/report');

const minIndex = process.argv.indexOf('--min');
const MIN_COUNT = minIndex > -1 ? Number(process.argv[minIndex + 1]) || 1 : 1;

/** Collapses spelling variants so that only genuinely distinct labels differ. */
const morphKey = (label) => stripDiacritics(label)
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .split(' ')
  .filter(Boolean)
  .map((word) => (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word))
  .join('');

main(async () => {
  const db = openDb();
  const { canonical } = loadOntology();
  const rows = await db.all('SELECT sector FROM enterprises WHERE TRIM(IFNULL(sector, "")) <> ""');
  await db.close();

  const counts = new Map();
  for (const row of rows) {
    for (const label of row.sector.split(',').map((value) => value.trim()).filter(Boolean)) {
      counts.set(label, (counts.get(label) || 0) + 1);
    }
  }

  const groups = new Map();
  for (const [label, n] of counts) {
    const key = morphKey(label);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ label, n, canonical: canonical.has(label) });
  }

  const merges = [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => group.sort((a, b) => Number(b.canonical) - Number(a.canonical) || b.n - a.n))
    .filter((group) => group.reduce((sum, item) => sum + item.n, 0) >= MIN_COUNT)
    .sort((a, b) => b.reduce((s, i) => s + i.n, 0) - a.reduce((s, i) => s + i.n, 0));

  const orphans = [...counts.entries()].filter(([label]) => !canonical.has(label)).sort((a, b) => b[1] - a[1]);

  header('Audit des labels sectoriels', {
    'labels distincts': counts.size,
    canoniques: canonical.size,
    'hors ontologie': orphans.length,
    'groupes de variantes': merges.length,
  });

  for (const group of merges) {
    const [target, ...variants] = group;
    console.log(`\n-> ${target.label}${target.canonical ? ' [canonique]' : ' [HORS ONTOLOGIE]'} (${target.n})`);
    for (const variant of variants) console.log(`     fusionner : ${variant.label} (${variant.n})`);
  }

  if (orphans.length) {
    console.log('\nLabels hors ontologie :');
    for (const [label, n] of orphans) console.log(`  ${String(n).padStart(4)}  ${label}`);
  }

  writeAudit('sector_label_variants_audit.json', { distinct_labels: counts.size, merges, orphans });
});
