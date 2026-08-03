/**
 * Recode le champ `sector` de la table enterprises vers le référentiel canonique à 22 labels.
 * Lancé en dry-run par défaut ; passer --apply pour écrire en base.
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DRY_RUN = !process.argv.includes('--apply');
const dbPath = path.join(__dirname, '..', 'database.db');

// ── Mapping atomique → label(s) canonique(s) ──────────────────────────────────
const ATOM_MAP = {
  // AI model
  'Artificial Intelligence': ['AI model'],
  'AI':                      ['AI model'],
  'AI lab':                  ['AI model'],
  'Agentic':                 ['AI model'],
  'Computer vision':         ['AI model'],
  'Vision':                  ['AI model'],
  'Speech':                  ['AI model'],

  // Aerospace & Defence
  'Defense':                      ['Aerospace & Defence'],
  'Defence':                      ['Aerospace & Defence'],
  // Ce label atomique composite s'explose en deux canoniques
  'Public Sector & Aerospace':    ['Public Sector', 'Aerospace & Defence'],

  // Cloud Provider
  'Cloud Infrastructure': ['Cloud Provider'],

  // Data
  'Data':                  ['Data'],
  'Data sciences':         ['Data'],
  'Economic intelligence': ['Data'],

  // Education
  'edtech': ['Education'],

  // Financial Services
  'Venture capital': ['Financial Services'],

  // Hardware
  'HPC':      ['Hardware'],
  'Robotics': ['Hardware'],

  // Health & Social Care
  'Health':   ['Health & Social Care'],
  'Oncology': ['Health & Social Care'],
  'Brain AI': ['Health & Social Care'],
  'Biotech':  ['Health & Social Care'],

  // IT & Security
  'Cyber security': ['IT & Security'],
  'Identity':       ['IT & Security'],

  // Manufacturing & Operations  (fusion des deux anciens labels)
  'Manufacturing': ['Manufacturing & Operations'],
  'Operations':    ['Manufacturing & Operations'],

  // Professional Services
  'legaltech':        ['Professional Services'],
  'Legal tech':       ['Professional Services'],
  'consulting':       ['Professional Services'],

  // Sales & Marketing  (fusion des deux anciens labels)
  'Sales':     ['Sales & Marketing'],
  'Marketing': ['Sales & Marketing'],

  // Cross Industry → supprimé (retourne [])
  'Cross Industry': [],
};

const CANONICAL = new Set([
  'Aerospace & Defence',
  'Agriculture & Forestry',
  'AI model',
  'Cloud Provider',
  'Construction',
  'Data',
  'Education',
  'Energy & Utilities',
  'Financial Services',
  'Hardware',
  'Health & Social Care',
  'ICT',
  'IT & Security',
  'Manufacturing & Operations',
  'Media & Entertainment',
  'Professional Services',
  'Public Sector',
  'R&D',
  'Real Estate Activities',
  'Retail & E-commerce',
  'Sales & Marketing',
  'Transport & Mobility',
]);

function recode(raw) {
  const atoms = raw.split(',').map(s => s.trim()).filter(Boolean);
  const result = new Set();
  for (const atom of atoms) {
    if (ATOM_MAP.hasOwnProperty(atom)) {
      ATOM_MAP[atom].forEach(c => result.add(c));
    } else if (CANONICAL.has(atom)) {
      result.add(atom);
    } else {
      // Atome inconnu : conserver tel quel pour ne pas perdre de données
      result.add(`UNKNOWN:${atom}`);
    }
  }
  return [...result].sort().join(', ') || null;
}

const db = new sqlite3.Database(dbPath);

db.all(`SELECT id, sector FROM enterprises WHERE sector IS NOT NULL AND sector != ''`, (err, rows) => {
  if (err) { console.error(err.message); process.exit(1); }

  const changes = [];
  const unknowns = new Set();

  for (const row of rows) {
    const newSector = recode(row.sector);
    if (newSector !== row.sector) {
      changes.push({ id: row.id, old: row.sector, new: newSector });
    }
    if (newSector && newSector.includes('UNKNOWN:')) unknowns.add(newSector);
  }

  console.log(`\n${DRY_RUN ? '[DRY-RUN] ' : ''}${changes.length} entreprises à mettre à jour sur ${rows.length}\n`);

  if (unknowns.size) {
    console.warn('⚠  Labels inconnus détectés (à traiter manuellement) :');
    unknowns.forEach(u => console.warn('  ', u));
    console.log('');
  }

  if (DRY_RUN) {
    // Afficher un aperçu des 30 premières modifications
    const preview = changes.slice(0, 30);
    preview.forEach(c => console.log(`  [${c.id}]\n    AVANT : ${c.old}\n    APRÈS : ${c.new}\n`));
    if (changes.length > 30) console.log(`  … et ${changes.length - 30} autres.\n`);
    console.log('Relancer avec --apply pour écrire en base.\n');
    db.close();
    return;
  }

  // ── Écriture en base ─────────────────────────────────────────────────────
  db.serialize(() => {
    const stmt = db.prepare(`UPDATE enterprises SET sector = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    for (const c of changes) {
      stmt.run(c.new, c.id);
    }
    stmt.finalize(err => {
      if (err) console.error('Erreur écriture :', err.message);
      else console.log(`✓ ${changes.length} lignes mises à jour.\n`);
      db.close();
    });
  });
});
