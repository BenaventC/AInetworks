const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const dbPath = require('./lib/db').DB_PATH;
const ontologyPath = path.join(__dirname, '..', 'public', 'sector_ontology.csv');

function parseOntology() {
  const [, ...rows] = fs.readFileSync(ontologyPath, 'utf8').trim().split(/\r?\n/);
  return rows.map((row) => {
    const [canonicalLabel, group, aliases, keywords] = row.split(',', 5);
    return {
      canonicalLabel: canonicalLabel.trim(),
      group: group.trim(),
      aliases: (aliases || '').split('|').map((value) => value.trim()).filter(Boolean),
      keywords: (keywords || '').split('|').map((value) => value.trim()).filter(Boolean)
    };
  });
}

const ontology = parseOntology();

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9&+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsTerm(text, term) {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return false;
  return (` ${text} `).includes(` ${normalizedTerm} `);
}

function enrichSector(sector, description) {
  const current = String(sector || '').split(',').map((value) => value.trim()).filter(Boolean);
  const currentCanonical = new Set(current.map((value) => normalizeText(value)));
  const text = normalizeText(description);
  const candidates = [];

  for (const entry of ontology) {
    if (currentCanonical.has(normalizeText(entry.canonicalLabel))) continue;

    const matchedAliases = entry.aliases.filter((term) => containsTerm(text, term));
    const matchedKeywords = entry.keywords.filter((term) => containsTerm(text, term));
    const strongAlias = matchedAliases.some((term) => normalizeText(term).length >= 6);
    const distinctSignals = new Set([...matchedAliases, ...matchedKeywords].map(normalizeText));
    const specificKeywords = matchedKeywords.filter((term) => normalizeText(term).length >= 6);
    const score = (strongAlias ? 3 : 0) + specificKeywords.length + matchedAliases.length;

    // Require corroborating signals before altering an existing classification.
    if (score < 3 || distinctSignals.size < 2 || specificKeywords.length === 0) continue;
    candidates.push({
      label: entry.canonicalLabel,
      score,
      signals: [...distinctSignals].slice(0, 3)
    });
  }

  candidates.sort((left, right) => right.score - left.score || left.label.localeCompare(right.label));
  const additions = candidates.slice(0, Math.min(2, 5 - current.length)).map((candidate) => candidate.label);
  return {
    sector: [...current, ...additions].join(', ') || null,
    additions,
    evidence: candidates.slice(0, additions.length)
  };
}

const db = new sqlite3.Database(dbPath);
db.all('SELECT id, name, sector, description FROM enterprises ORDER BY id', (error, rows) => {
  if (error) throw error;

  const updates = rows.map((row) => ({
    ...row,
    originalSector: row.sector,
    ...enrichSector(row.sector, row.description)
  })).filter((row) => row.additions.length > 0);

  console.log(`Total enterprises: ${rows.length}`);
  console.log(`Rows with suggested additions: ${updates.length}`);
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  updates.slice(0, 40).forEach((row) => {
    console.log(`#${row.id} ${row.name}`);
    console.log(`  FROM: ${row.originalSector || '<empty>'}`);
    console.log(`  ADD : ${row.additions.join(', ')} (${row.evidence.map((item) => item.signals.join(' + ')).join('; ')})`);
    console.log(`  TO  : ${row.sector || '<empty>'}`);
  });
  if (updates.length > 40) console.log(`... and ${updates.length - 40} more`);

  if (!APPLY || updates.length === 0) {
    db.close();
    return;
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    const statement = db.prepare('UPDATE enterprises SET sector = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    updates.forEach((row) => statement.run(row.sector, row.id));
    statement.finalize((finalizeError) => {
      if (finalizeError) {
        db.run('ROLLBACK', () => db.close());
        throw finalizeError;
      }
      db.run('COMMIT', (commitError) => {
        if (commitError) throw commitError;
        console.log(`Applied updates: ${updates.length}`);
        db.close();
      });
    });
  });
});