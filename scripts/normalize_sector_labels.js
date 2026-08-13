/**
 * Normalise le champ `sector` de la table enterprises vers un référentiel fermé.
 * Opère en dry-run par défaut ; passer --apply pour écrire en base.
 */
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const dbPath = path.join(__dirname, '..', 'database.db');
const ontologyPath = path.join(__dirname, '..', 'public', 'sector_ontology.csv');

function loadSectorOntology() {
  const lines = fs.readFileSync(ontologyPath, 'utf8').trim().split(/\r?\n/);
  const [header, ...rows] = lines;
  if (header !== 'canonical_label,group,alias_terms,keyword_terms,description') {
    throw new Error(`Unexpected sector ontology header in ${ontologyPath}`);
  }
  return rows.map((row) => {
    const [canonicalLabel, group, aliasTerms, keywordTerms] = row.split(',', 5);
    return {
      canonicalLabel,
      group,
      aliases: (aliasTerms || '').split('|').map((term) => term.trim()).filter(Boolean),
      keywords: (keywordTerms || '').split('|').map((term) => term.trim().toLowerCase()).filter(Boolean),
    };
  });
}

const ONTOLOGY = loadSectorOntology();

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
  'Venture capital':         'Venture Capital',
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
  'Transport & Mobility', 'Venture Capital',
]);

const PLACEHOLDERS = new Set(['N/A', 'NA', 'N', 'A']);

const TARGET_LABELS = new Set(ONTOLOGY.map((entry) => entry.canonicalLabel));

function classifySectorAtom(atom) {
  const text = atom.trim();
  const value = text.toLowerCase();
  const labels = new Set();
  const add = (label) => labels.add(label);

  if (TARGET_LABELS.has(text)) return [text];
  for (const entry of ONTOLOGY) {
    if (entry.aliases.some((alias) => alias.toLowerCase() === value)
      || entry.keywords.some((keyword) => value.includes(keyword))) {
      add(entry.canonicalLabel);
    }
  }
  if (/venture|private equity|hedge fund|asset management|investment (company|management)|angel investment/.test(value)) add('Venture Capital');
  if (/defen[cs]e|military/.test(value)) add('Defence');
  if (/aerospace|aviation|space |satellite/.test(value)) add('Aerospace');
  if (/drone|\buav\b/.test(value)) add('Drone & UAV');
  if (/robot/.test(value)) add('Robotics');
  if (/automation|autonomous security/.test(value)) add('Automation');
  if (/healthtech|healthcare|health care|medical ai|medical tech|care tech|cardio|dental|radiology/.test(value)) add('HealthTech');
  if (/medtech|med tech/.test(value)) add('MedTech');
  if (/biotech|pharma|drug discovery|oncology/.test(value)) add('Biotech');
  if (/legal|lawtech|compliance/.test(value)) add('LegalTech');
  if (/\bhr\b|recruit|human resources|hrm/.test(value)) add('HRM');
  if (/cyber|security|identity|data protection/.test(value)) add('IT & Security');
  if (/cloud|neocloud|edge computing|data center|networking|\biaas\b|\bpaas\b/.test(value)) add('Cloud Provider');
  if (/inference|model serving|\bapi[s]?\b|ml infrastructure/.test(value)) add('Inference & Model Serving');
  if (/infrastructure|database|datalake/.test(value)) add('Infrastructure');
  if (/gpu|cpu|chip|processor|accelerator|hardware|electronic|photonic|lithography/.test(value)) add('Hardware');
  if (/semiconductor/.test(value)) add('Semiconductors');
  if (/computer vision|image|imaging|geospatial/.test(value)) add('Computer Vision');
  if (/\bai\b|\bllms?\b|language model|foundation model|generative ai|artificial intelligence|ai model|machine learning|multimodal|world model/.test(value)) add('AI model');
  if (/agentic|\bagents?\b/.test(value)) add('Agentic');
  if (/nlp|conversational|chatbot|translation|langops|\bsearch\b/.test(value)) add('Natural Language Processing');
  if (/voice|audio|sound|speech/.test(value)) add('Voice & Audio AI');
  if (/video|creative ai|digital art|image generation|generative media/.test(value)) add('Generative Media');
  if (/gaming|game|entertainment|media|music|publishing|news|sports/.test(value)) add('Media & Entertainment');
  if (/advertising|adtech/.test(value)) add('Advertising');
  if (/marketing|seo|brand|campaign/.test(value)) add('Marketing');
  if (/\bsales\b|\bcrm\b|lead generation|customer service|customer experience|\bcx\b/.test(value)) add('Sales');
  if (/customer experience|customer service|\bcx\b/.test(value)) add('Customer Experience');
  if (/finance|fintech|banking|payment|insurance|trading|cryptocurrency|blockchain/.test(value)) add('Financial Services');
  if (/blockchain|cryptocurrency|web3/.test(value)) add('Blockchain & Web3');
  if (/data|analytics|business intelligence|annotation|training data/.test(value)) add('Data');
  if (/developer|\bide\b|code|no-code|app development|testing|quality assurance/.test(value)) add('Developer Tools');
  if (/document ai|document management|document/.test(value)) add('Document AI');
  if (/education|edtech|learning|tutoring/.test(value)) add('Education');
  if (/agri|agriculture|foodtech|forestry/.test(value)) add('Agriculture & Forestry');
  if (/energy|climate|green ?tech|clean tech|utilities|marine/.test(value)) add('Energy & ClimateTech');
  if (/retail|e-commerce|marketplace/.test(value)) add('Retail & E-commerce');
  if (/real estate|proptech|property|construction|\bbim\b/.test(value)) add('Real Estate & PropTech');
  if (/logistics|supply chain|shipping|freight/.test(value)) add('Logistics & Supply Chain');
  if (/mobility|transport|autonomous vehicle|truck/.test(value)) add('Mobility & Transport');
  if (/manufacturing|industrial|factory|assembly|cad|cam|engineering simulation/.test(value)) add('Industrial & Manufacturing');
  if (/operations|procurement|purchasing|\bops\b|predictive maintenance/.test(value)) add('Operations');
  if (/research|\br&d\b|innovation/.test(value)) add('R&D');
  if (/public sector|government|public administration|social security/.test(value)) add('Public Sector');
  if (/professional|consulting|business services|technical services/.test(value)) add('Professional Services');
  if (/workflow|productivity|enterprise software|erp|collaboration/.test(value)) add('Workflow & Productivity');
  if (/spatial|extended reality|virtual reality|augmented reality|\bav\b/.test(value)) add('Spatial Computing');

  return labels.size ? [...labels] : ['ICT'];
}

function normalizeAtom(atom) {
  const trimmed = atom.trim();
  if (PLACEHOLDERS.has(trimmed.toUpperCase())) return null;
  return classifySectorAtom(trimmed);
}

function isKnownAtom(atom) {
  return !PLACEHOLDERS.has(atom.trim().toUpperCase());
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
  const labelsWithoutIct = normalized.filter((label) => label !== 'ICT');
  const retained = labelsWithoutIct.length >= 1 ? labelsWithoutIct : normalized;
  const sector = retained.sort().slice(0, 5).join(', ');
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
