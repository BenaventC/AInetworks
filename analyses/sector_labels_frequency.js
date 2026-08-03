const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

db.all(`SELECT sector FROM enterprises WHERE sector IS NOT NULL AND sector != ''`, (err, rows) => {
  if (err) { console.error(err.message); process.exit(1); }

  // ── Combinaisons (valeurs brutes) ──────────────────────────────────────────
  const comboCounts = {};
  rows.forEach(r => {
    comboCounts[r.sector] = (comboCounts[r.sector] || 0) + 1;
  });
  const combos = Object.entries(comboCounts).sort((a, b) => b[1] - a[1]);
  const totalRows = rows.length;
  const maxComboLen = Math.max(...combos.map(([k]) => k.length));

  console.log('\n══ COMBINAISONS (valeurs brutes) ══════════════════════════════════════');
  console.log(`${'Secteur'.padEnd(maxComboLen + 2)} Count     %`);
  console.log('-'.repeat(maxComboLen + 18));
  combos.forEach(([label, count]) => {
    const pct = ((count / totalRows) * 100).toFixed(1);
    console.log(`${label.padEnd(maxComboLen + 2)} ${String(count).padStart(4)}   ${pct}%`);
  });
  console.log('-'.repeat(maxComboLen + 18));
  console.log(`${'TOTAL'.padEnd(maxComboLen + 2)} ${String(totalRows).padStart(4)}`);
  console.log(`\n${combos.length} combinaisons distinctes`);

  // ── Labels atomiques (split sur ", ") ─────────────────────────────────────
  const atomicCounts = {};
  rows.forEach(r => {
    r.sector.split(',').map(s => s.trim()).forEach(atom => {
      if (atom) atomicCounts[atom] = (atomicCounts[atom] || 0) + 1;
    });
  });
  const atoms = Object.entries(atomicCounts).sort((a, b) => b[1] - a[1]);
  const maxAtomLen = Math.max(...atoms.map(([k]) => k.length));

  console.log('\n══ LABELS ATOMIQUES (après split sur ", ") ═══════════════════════════');
  console.log(`${'Label'.padEnd(maxAtomLen + 2)} Count`);
  console.log('-'.repeat(maxAtomLen + 10));
  atoms.forEach(([label, count]) => {
    console.log(`${label.padEnd(maxAtomLen + 2)} ${String(count).padStart(4)}`);
  });
  console.log('-'.repeat(maxAtomLen + 10));
  console.log(`\n${atoms.length} labels atomiques distincts\n`);

  db.close();
});
