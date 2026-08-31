const { openDb } = require('./lib/db');
const { loadOntology } = require('./lib/ontology');
const { main } = require('./lib/report');

main(async () => {
  const db = openDb();
  const { labelToDomain } = loadOntology();
  const n = async (sql) => (await db.get(sql)).n;

  const rows = [
    ['enterprises', await n('SELECT COUNT(*) n FROM enterprises')],
    ['  sans description', await n("SELECT COUNT(*) n FROM enterprises WHERE TRIM(IFNULL(description,'')) = ''")],
    ['  sans pays', await n("SELECT COUNT(*) n FROM enterprises WHERE TRIM(IFNULL(country,'')) = ''")],
    ['  sans secteur', await n("SELECT COUNT(*) n FROM enterprises WHERE TRIM(IFNULL(sector,'')) = ''")],
    ['  sans sector_domains', await n("SELECT COUNT(*) n FROM enterprises WHERE TRIM(IFNULL(sector_domains,'')) = ''")],
    ['  a revoir (is_validated=3)', await n('SELECT COUNT(*) n FROM enterprises WHERE is_validated = 3')],
    ['investors', await n('SELECT COUNT(*) n FROM investors')],
    ['  sans investor_type', await n("SELECT COUNT(*) n FROM investors WHERE TRIM(IFNULL(investor_type,'')) = ''")],
    ['  sans pays', await n("SELECT COUNT(*) n FROM investors WHERE TRIM(IFNULL(country,'')) = ''")],
    ['partnerships', await n('SELECT COUNT(*) n FROM partnerships')],
    ['  orphelines', await n('SELECT COUNT(*) n FROM partnerships p LEFT JOIN enterprises a ON a.id=p.enterprise1_id LEFT JOIN enterprises b ON b.id=p.enterprise2_id WHERE a.id IS NULL OR b.id IS NULL')],
  ];
  for (const [label, value] of rows) console.log(`${label.padEnd(32)} ${String(value).padStart(6)}`);

  const labels = new Set();
  for (const r of await db.all("SELECT sector FROM enterprises WHERE TRIM(IFNULL(sector,'')) <> ''")) {
    for (const l of r.sector.split(',').map((v) => v.trim()).filter(Boolean)) {
      if (!labelToDomain.has(l.toLowerCase())) labels.add(l);
    }
  }
  console.log(`\nlabels sans domaine (${labels.size}) : ${[...labels].join(', ')}`);

  const mojibake = await n("SELECT COUNT(*) n FROM enterprises WHERE description LIKE '%Ã©%' OR description LIKE '%â€%' OR name LIKE '%Ã%'");
  console.log(`fiches avec caracteres corrompus : ${mojibake}`);

  const dupes = await db.all("SELECT LOWER(REPLACE(REPLACE(name,' ',''),'-','')) k, COUNT(*) n, GROUP_CONCAT(name, ' | ') names FROM enterprises GROUP BY k HAVING n > 1");
  console.log(`doublons de nom normalise : ${dupes.length}`);
  for (const d of dupes.slice(0, 10)) console.log(`   ${d.names}`);

  await db.close();
});
