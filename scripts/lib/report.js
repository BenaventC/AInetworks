/** Uniform preview / apply reporting for the maintenance scripts. */

const fs = require('fs');
const path = require('path');
const { ROOT, APPLY, DB_PATH } = require('./db');

const SAMPLE = 20;

function header(title, facts = {}) {
  console.log(`${title} — ${path.relative(ROOT, DB_PATH)}`);
  const line = Object.entries(facts).map(([key, value]) => `${key}: ${value}`).join(' | ');
  if (line) console.log(line);
}

/** Prints a bounded sample of `{ id, name, from, to }` changes. */
function preview(changes, label = 'Changements') {
  console.log(`\n${label} : ${changes.length}`);
  for (const change of changes.slice(0, SAMPLE)) {
    console.log(`  #${change.id} ${change.name}`);
    if (change.from !== undefined) console.log(`      avant : ${change.from ?? '(vide)'}`);
    if (change.to !== undefined) console.log(`      apres : ${change.to ?? '(vide)'}`);
  }
  if (changes.length > SAMPLE) console.log(`  ... et ${changes.length - SAMPLE} autres`);
}

function footer(appliedCount) {
  console.log(APPLY ? `\n${appliedCount} enregistrements mis a jour.` : '\n(Mode apercu — relancer avec --apply pour ecrire.)');
}

/** Writes a UTF-8 JSON audit under exports/ and returns its path. */
function writeAudit(filename, payload) {
  const outDir = path.join(ROOT, 'exports');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, filename);
  fs.writeFileSync(outPath, JSON.stringify({ generated_at: new Date().toISOString(), applied: APPLY, ...payload }, null, 2), 'utf8');
  console.log(`Audit : ${path.relative(ROOT, outPath)}`);
  return outPath;
}

/** Wraps a script body so any failure exits with a non-zero status. */
function main(fn) {
  fn().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { header, preview, footer, writeAudit, main };
