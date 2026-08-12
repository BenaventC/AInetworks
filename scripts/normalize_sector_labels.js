/**
 * Normalise le champ `sector` de la table enterprises vers un référentiel fermé.
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
  'Computer vision':         'AI model',
  'Vision':                  'AI model',
  'Speech':                  'AI model',
  // Health
  'Health':                  'HealthTech',
  'Health & Social Care':    'HealthTech',
  'Oncology':                'HealthTech',
  'Brain AI':                'HealthTech',
  'Healthtech':              'HealthTech',
  'Med tech':                'MedTech',
  'Medical Tech':            'MedTech',
  // Human resources
  'HR':                      'HRM',
  'Recruiting':              'HRM',
  // IT & Security
  'Cyber security':          'IT & Security',
  'Identity':                'IT & Security',
  // Aerospace, defence and public sector
  'Defense':                 'Defence',
  'Aerospace & Defence':     ['Aerospace', 'Defence'],
  'Public Sector & Aerospace': ['Aerospace', 'Public Sector'],
  // Hardware
  'HPC':                     'Hardware',
  // Legal
  'legaltech':               'LegalTech',
  'Legal tech':              'LegalTech',
  'LawTech':                 'LegalTech',
  'Legal Technology':        'LegalTech',
  // Cloud
  'Cloud Infrastructure':    'Cloud Provider',
  // Professional Services
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
  'Aerospace', 'Agriculture & Forestry', 'AI model', 'Cloud Provider',
  'Construction',
  'Cross Industry', 'Data', 'Education', 'Energy & Utilities',
  'Agentic', 'Automation', 'Biotech', 'Defence', 'Financial Services', 'Hardware',
  'HealthTech', 'HRM', 'ICT',
  'IT & Security', 'LegalTech', 'Manufacturing', 'Marketing', 'MedTech',
  'Media & Entertainment', 'Operations', 'Professional Services', 'Public Sector',
  'Robotics',
  'R&D', 'Real Estate Activities', 'Retail & E-commerce', 'Sales',
  'Transport & Mobility',
]);

const PLACEHOLDERS = new Set(['N/A', 'NA', 'N', 'A']);

function normalizeAtom(atom) {
  const trimmed = atom.trim();
  if (PLACEHOLDERS.has(trimmed.toUpperCase())) return null;
  if (ATOM_MAP[trimmed]) return ATOM_MAP[trimmed];
  if (CANONICAL.has(trimmed)) return trimmed;
  // Capitalise le premier caractère (sécurité)
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  if (CANONICAL.has(capitalized)) return capitalized;
  return trimmed; // conserver en attente d'une règle de normalisation
}

function isKnownAtom(atom) {
  const trimmed = atom.trim();
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return Object.prototype.hasOwnProperty.call(ATOM_MAP, trimmed)
    || CANONICAL.has(trimmed)
    || CANONICAL.has(capitalized);
}

function normalizeSector(raw) {
  const atoms = raw.split(',').map(s => s.trim()).filter(Boolean);
  const normalized = [];
  const unknown = [];
  for (const atom of atoms) {
    const mapped = normalizeAtom(atom);
    const labels = Array.isArray(mapped) ? mapped : [mapped];
    for (const label of labels) {
      if (label && !normalized.includes(label)) normalized.push(label);
    }
    if (mapped && !isKnownAtom(atom)) unknown.push(atom);
  }
  const sector = normalized.sort().slice(0, 5).join(', ');
  return { normalized: sector || null, unknown };
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
    console.log('⚠  Labels atomiques non reconnus (conservés en attente de règle) :');
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
