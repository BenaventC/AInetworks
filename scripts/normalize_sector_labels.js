/**
 * Normalise le champ `sector` de la table enterprises vers un référentiel fermé de 24 labels.
 * Opère en dry-run par défaut ; passer --apply pour écrire en base.
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const APPLY = process.argv.includes('--apply');
const dbPath = path.join(__dirname, '..', 'database.db');

// ── Mapping atomique → label canonique ────────────────────────────────────────
const ATOM_MAP = {
  // AI
  'Artificial Intelligence': 'AI model',
  'AI':                      'AI model',
  'AI lab':                  'AI model',
  'Agentic':                 'AI model',
  'Computer vision':         'AI model',
  'Vision':                  'AI model',
  'Speech':                  'AI model',
  // Health
  'Health':                  'Health & Social Care',
  'Oncology':                'Health & Social Care',
  'Brain AI':                'Health & Social Care',
  'Biotech':                 'Health & Social Care',
  // IT & Security
  'Cyber security':          'IT & Security',
  'Identity':                'IT & Security',
  // Public Sector
  'Defense':                 'Public Sector & Aerospace',
  'Defence':                 'Public Sector & Aerospace',
  // Hardware
  'HPC':                     'Hardware',
  'Robotics':                'Hardware',
  // Cloud
  'Cloud Infrastructure':    'Cloud Provider',
  // Professional Services
  'legaltech':               'Professional Services',
  'Legal tech':              'Professional Services',
  'consulting':              'Professional Services',
  // Education
  'edtech':                  'Education',
  // Data
  'Data sciences':           'Data',
  'Economic intelligence':   'Data',
  // Financial
  'Venture capital':         'Financial Services',
};

const CANONICAL = new Set([
  'Agriculture & Forestry', 'AI model', 'Cloud Provider', 'Construction',
  'Cross Industry', 'Data', 'Education', 'Energy & Utilities',
  'Financial Services', 'Hardware', 'Health & Social Care', 'ICT',
  'IT & Security', 'Manufacturing', 'Marketing', 'Media & Entertainment',
  'Operations', 'Professional Services', 'Public Sector & Aerospace',
  'R&D', 'Real Estate Activities', 'Retail & E-commerce', 'Sales',
  'Transport & Mobility',
]);

function normalizeAtom(atom) {
  const trimmed = atom.trim();
  if (ATOM_MAP[trimmed]) return ATOM_MAP[trimmed];
  if (CANONICAL.has(trimmed)) return trimmed;
  // Capitalise le premier caractère (sécurité)
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  if (CANONICAL.has(capitalized)) return capitalized;
  return null; // non reconnu
}

function normalizeSector(raw) {
  const atoms = raw.split(',').map(s => s.trim()).filter(Boolean);
  const normalized = [];
  const unknown = [];
  for (const atom of atoms) {
    const mapped = normalizeAtom(atom);
    if (mapped && !normalized.includes(mapped)) normalized.push(mapped);
    else if (!mapped) unknown.push(atom);
  }
  return { normalized: normalized.sort().join(', '), unknown };
}

const db = new sqlite3.Database(dbPath);

db.all(`SELECT id, name, sector FROM enterprises WHERE sector IS NOT NULL AND sector != ''`, (err, rows) => {
  if (err) { console.error(err.message); process.exit(1); }

  const changes = [];
  const unknownAll = new Set();

  for (const row of rows) {
    const { normalized, unknown } = normalizeSector(row.sector);
    unknown.forEach(u => unknownAll.add(u));
    if (normalized !== row.sector) {
      changes.push({ id: row.id, name: row.name, old: row.sector, new: normalized });
    }
  }

  console.log(`\n${rows.length} entreprises analysées — ${changes.length} à modifier\n`);

  if (unknownAll.size > 0) {
    console.log('⚠  Labels atomiques non reconnus (ignorés) :');
    [...unknownAll].forEach(u => console.log(`   • "${u}"`));
    console.log();
  }

  // Aperçu des 20 premiers changements
  const preview = changes.slice(0, 20);
  preview.forEach(c => {
    console.log(`[${c.id}] ${c.name}`);
    console.log(`  avant : ${c.old}`);
    console.log(`  après : ${c.new}\n`);
  });
  if (changes.length > 20) console.log(`... et ${changes.length - 20} autres\n`);

  if (!APPLY) {
    console.log('Mode dry-run. Relancer avec --apply pour écrire en base.');
    db.close();
    return;
  }

  // Application
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    let done = 0;
    for (const c of changes) {
      db.run(`UPDATE enterprises SET sector = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [c.new, c.id], (err) => {
          if (err) console.error(`Erreur id=${c.id}: ${err.message}`);
          if (++done === changes.length) {
            db.run('COMMIT', () => {
              console.log(`\n✓ ${changes.length} enregistrements mis à jour.`);
              db.close();
            });
          }
        });
    }
  });
});
