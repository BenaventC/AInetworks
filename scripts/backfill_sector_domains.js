/**
 * Regenerates `enterprises.sector_domains`, the meta level derived from `sector`
 * through public/sector_ontology.csv. The server recomputes it on every write;
 * this script is for bulk imports and ontology edits.
 *
 * Usage: node scripts/backfill_sector_domains.js [--apply]
 */

const { openDb, APPLY, withTransaction } = require('./lib/db');
const { loadOntology, domainsForSector } = require('./lib/ontology');
const { header, preview, footer, main } = require('./lib/report');

main(async () => {
  const db = openDb();
  const { labelToDomain } = loadOntology();
  const rows = await db.all('SELECT id, name, sector, sector_domains FROM enterprises');

  const changes = [];
  const perDomain = new Map();
  const unmapped = new Map();

  for (const row of rows) {
    const domains = domainsForSector(row.sector, labelToDomain);
    for (const domain of (domains || '').split(', ').filter(Boolean)) {
      perDomain.set(domain, (perDomain.get(domain) || 0) + 1);
    }
    for (const label of String(row.sector || '').split(',').map((value) => value.trim()).filter(Boolean)) {
      if (!labelToDomain.has(label.toLowerCase())) unmapped.set(label, (unmapped.get(label) || 0) + 1);
    }
    if ((row.sector_domains || null) !== domains) {
      changes.push({ id: row.id, name: row.name, from: row.sector_domains, to: domains, domains });
    }
  }

  header('Backfill des domaines sectoriels', {
    entreprises: rows.length,
    domaines: perDomain.size,
    'a mettre a jour': changes.length,
  });

  console.log('\nRepartition par domaine :');
  for (const [domain, n] of [...perDomain].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${domain}`);
  }

  if (unmapped.size) {
    console.log('\nLabels sans domaine declare :');
    for (const [label, n] of [...unmapped].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(5)}  ${label}`);
    }
  }

  preview(changes, 'Fiches a mettre a jour');

  if (APPLY && changes.length) {
    await withTransaction(db, async () => {
      for (const change of changes) {
        await db.run('UPDATE enterprises SET sector_domains = ? WHERE id = ?', [change.domains, change.id]);
      }
    });
  }

  footer(APPLY ? changes.length : 0);
  await db.close();
});
