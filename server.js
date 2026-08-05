const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const dbPath = path.join(__dirname, 'database.db');

// Seed aléatoire fixé pour toute la session — nouvel ordre à chaque redémarrage
const SESSION_SEED = Math.floor(Math.random() * 999983) + 1;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialiser la base de données
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error(err.message);
  else console.log('✓ Connecté à la base de données SQLite');
  initializeDatabase();
});

// Initialiser les tables
function initializeDatabase() {
  db.serialize(() => {
    // Table des entreprises
    db.run(`CREATE TABLE IF NOT EXISTS enterprises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sector TEXT,
      organization_type TEXT,
      country TEXT,
      headquarter_city TEXT,
      founded_year INTEGER,
      description TEXT,
      website TEXT,
      logo_url TEXT,
      capitalization TEXT,
      funds_raised TEXT,
      revenue_millions REAL,
      employees_count INTEGER,
      main_investors TEXT,
      main_competitors TEXT,
      participation TEXT,
      main_acquisitions TEXT,
      key_resources TEXT,
      strategic_partnerships TEXT,
      is_validated INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Erreur CREATE TABLE enterprises:', err.message);
        return;
      }
      
      // Check and add missing columns
      db.all('PRAGMA table_info(enterprises)', (err, rows) => {
        if (err) {
          console.error('Erreur PRAGMA table_info:', err.message);
          return;
        }

        const columns = new Set(rows.map((row) => row.name));
        if (!columns.has('organization_type')) {
          db.run('ALTER TABLE enterprises ADD COLUMN organization_type TEXT', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE organization_type:', err.message);
            }
          });
        }
        if (!columns.has('headquarter_city')) {
          db.run('ALTER TABLE enterprises ADD COLUMN headquarter_city TEXT', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE headquarter_city:', err.message);
            }
          });
        }
        if (!columns.has('main_investors')) {
          db.run('ALTER TABLE enterprises ADD COLUMN main_investors TEXT', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE main_investors:', err.message);
            }
          });
        }
        if (!columns.has('funds_raised')) {
          db.run('ALTER TABLE enterprises ADD COLUMN funds_raised TEXT', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE funds_raised:', err.message);
            }
          });
        }
        if (!columns.has('revenue_millions')) {
          db.run('ALTER TABLE enterprises ADD COLUMN revenue_millions REAL', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE revenue_millions:', err.message);
            }
          });
        }
        if (!columns.has('main_competitors')) {
          db.run('ALTER TABLE enterprises ADD COLUMN main_competitors TEXT', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE main_competitors:', err.message);
            }
          });
        }
        if (!columns.has('participation')) {
          db.run('ALTER TABLE enterprises ADD COLUMN participation TEXT', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE participation:', err.message);
            }
          });
        }
        if (!columns.has('main_acquisitions')) {
          db.run('ALTER TABLE enterprises ADD COLUMN main_acquisitions TEXT', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE main_acquisitions:', err.message);
            }
          });
        }
        if (!columns.has('key_resources')) {
          db.run('ALTER TABLE enterprises ADD COLUMN key_resources TEXT', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE key_resources:', err.message);
            }
          });
        }
        if (!columns.has('strategic_partnerships')) {
          db.run('ALTER TABLE enterprises ADD COLUMN strategic_partnerships TEXT', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE strategic_partnerships:', err.message);
            }
          });
        }
        if (!columns.has('end_year')) {
          db.run('ALTER TABLE enterprises ADD COLUMN end_year INTEGER', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE end_year:', err.message);
            }
          });
        }
        if (!columns.has('end_reason')) {
          db.run('ALTER TABLE enterprises ADD COLUMN end_reason TEXT', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE end_reason:', err.message);
            }
          });
        }
        if (!columns.has('company_status')) {
          db.run('ALTER TABLE enterprises ADD COLUMN company_status TEXT', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE company_status:', err.message);
            }
          });
        }
        const setDefaultValidationValue = () => {
          // Normalize only invalid/null values and preserve the current 3-level model:
          // 0 = not validated, 1 = partially validated, 2 = validated, 3 = review later.
          db.run('UPDATE enterprises SET is_validated = 0 WHERE is_validated IS NULL OR is_validated NOT IN (0, 1, 2, 3)', (err) => {
            if (err) {
              console.error('Erreur UPDATE enterprises.is_validated normalisation:', err.message);
            }
          });

          normalizeEnterpriseCapitalizations();
        };

        if (!columns.has('is_validated')) {
          db.run('ALTER TABLE enterprises ADD COLUMN is_validated INTEGER NOT NULL DEFAULT 0', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE is_validated:', err.message);
              return;
            }
            setDefaultValidationValue();
          });
        } else {
          setDefaultValidationValue();
        }
      });
    });

    // Table des partenariats
    db.run(`CREATE TABLE IF NOT EXISTS partnerships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enterprise1_id INTEGER NOT NULL,
      enterprise2_id INTEGER NOT NULL,
      partnership_type TEXT,
      type_relation TEXT,
      description TEXT,
      start_date TEXT,
      end_year INTEGER,
      source TEXT,
      sources_information TEXT,
      infra_commitment_text TEXT,
      value_millions REAL,
      is_validated INTEGER NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(enterprise1_id) REFERENCES enterprises(id) ON DELETE CASCADE,
      FOREIGN KEY(enterprise2_id) REFERENCES enterprises(id) ON DELETE CASCADE,
      UNIQUE(enterprise1_id, enterprise2_id)
    )`, (err) => {
      if (err) {
        console.error('Erreur CREATE TABLE partnerships:', err.message);
        return;
      }

      db.all('PRAGMA table_info(partnerships)', (pragmaErr, rows) => {
        if (pragmaErr) {
          console.error('Erreur PRAGMA table_info partnerships:', pragmaErr.message);
          return;
        }

        const columns = new Set(rows.map((row) => row.name));

        const syncTypeRelation = () => {
          db.run(
            `UPDATE partnerships
             SET type_relation = partnership_type
             WHERE (type_relation IS NULL OR TRIM(type_relation) = '')
               AND partnership_type IS NOT NULL
               AND TRIM(partnership_type) <> ''`,
            (updateErr) => {
              if (updateErr) {
                console.error('Erreur synchronisation type_relation:', updateErr.message);
              }
            }
          );
        };

        if (!columns.has('sources_information')) {
          db.run('ALTER TABLE partnerships ADD COLUMN sources_information TEXT', (alterErr) => {
            if (alterErr && !alterErr.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE partnerships.sources_information:', alterErr.message);
            }
          });
        }

        if (!columns.has('type_relation')) {
          db.run('ALTER TABLE partnerships ADD COLUMN type_relation TEXT', (alterErr) => {
            if (alterErr && !alterErr.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE partnerships.type_relation:', alterErr.message);
            }
            syncTypeRelation();
          });
        } else {
          syncTypeRelation();
        }

        if (!columns.has('value_millions')) {
          db.run('ALTER TABLE partnerships ADD COLUMN value_millions REAL', (alterErr) => {
            if (alterErr && !alterErr.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE partnerships.value_millions:', alterErr.message);
            }
          });
        }

        if (!columns.has('infra_commitment_text')) {
          db.run('ALTER TABLE partnerships ADD COLUMN infra_commitment_text TEXT', (alterErr) => {
            if (alterErr && !alterErr.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE partnerships.infra_commitment_text:', alterErr.message);
            }
          });
        }

        if (!columns.has('end_year')) {
          db.run('ALTER TABLE partnerships ADD COLUMN end_year INTEGER', (alterErr) => {
            if (alterErr && !alterErr.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE partnerships.end_year:', alterErr.message);
            }
          });
        }

        const setDefaultPartnershipValidation = () => {
          db.run('UPDATE partnerships SET is_validated = 0 WHERE is_validated IS NULL OR is_validated NOT IN (0, 1, 2, 3)', (updateErr) => {
            if (updateErr) {
              console.error('Erreur UPDATE partnerships.is_validated normalisation:', updateErr.message);
            }
          });
        };

        if (!columns.has('is_validated')) {
          db.run('ALTER TABLE partnerships ADD COLUMN is_validated INTEGER NOT NULL DEFAULT 0', (alterErr) => {
            if (alterErr && !alterErr.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE partnerships.is_validated:', alterErr.message);
              return;
            }
            setDefaultPartnershipValidation();
          });
        } else {
          setDefaultPartnershipValidation();
        }

        db.run(
          `UPDATE partnerships
           SET partnership_type = 'Acquisition / Integration'
           WHERE LOWER(REPLACE(partnership_type, 'é', 'e')) IN ('acquisition', 'integration')`,
          (updateErr) => {
            if (updateErr) {
              console.error('Erreur normalisation partnership_type:', updateErr.message);
            }
          }
        );

      });
    });
  });
}

function normalizePartnershipType(value) {
  if (!value || typeof value !== 'string') {
    return value;
  }

  const TOKEN_MAP = new Map([
    ['investissement', 'Investment'],
    ['partenariat technologique', 'Technology Partnership'],
    ['autre', 'Other'],
    ['acquisition', 'Acquisition / Integration'],
    ['integration', 'Acquisition / Integration'],
    ['partnership', 'Partnership']
  ]);

  const tokens = value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const normalized = token
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return TOKEN_MAP.get(normalized) || token;
    });

  const unique = [...new Set(tokens)];
  return unique.join(', ');
}

function parseLocaleNumber(value) {
  if (value === null || value === undefined) {
    return NaN;
  }

  let text = String(value).trim();
  if (!text) {
    return NaN;
  }

  text = text.replace(/[\u202f\u00a0\s]/g, '');

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      text = text.replace(/\./g, '').replace(',', '.');
    } else {
      text = text.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    const decimalCandidate = text.length - lastComma - 1;
    if (decimalCandidate > 0 && decimalCandidate <= 3) {
      text = text.replace(',', '.');
    } else {
      text = text.replace(/,/g, '');
    }
  } else if (lastDot !== -1) {
    const decimalCandidate = text.length - lastDot - 1;
    if (!(decimalCandidate > 0 && decimalCandidate <= 3)) {
      text = text.replace(/\./g, '');
    }
  }

  return Number.parseFloat(text);
}

function parseCapitalizationToMillions(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  const text = String(value).trim();
  if (!text) {
    return 0;
  }

  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/usd|eur|dollars?|euros?/g, '')
    .replace(/[\$€]/g, '')
    .trim();

  const match = normalized.match(/(-?\d[\d\s.,]*)\s*(trillion|trillions|\bt\b|billion|billions|\bbn\b|\bb\b|milliard|milliards|million|millions|\bmn\b|\bm\b)?/);
  if (!match) {
    return 0;
  }

  const numericValue = parseLocaleNumber(match[1]);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  const unit = match[2] || '';
  let multiplier = 1;

  if (unit === 'trillion' || unit === 'trillions' || unit === 't') {
    multiplier = 1_000_000;
  } else if (unit === 'billion' || unit === 'billions' || unit === 'bn' || unit === 'b' || unit === 'milliard' || unit === 'milliards') {
    multiplier = 1_000;
  } else if (unit === 'million' || unit === 'millions' || unit === 'mn' || unit === 'm') {
    multiplier = 1;
  }

  const inMillions = numericValue * multiplier;
  return Number.isFinite(inMillions) && inMillions > 0 ? inMillions : 0;
}

function formatMillionsFr(value) {
  const safe = Number.isFinite(value) && value > 0 ? value : 0;
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  }).format(safe).replace(/[\u202f\u00a0]/g, ' ');
}

function normalizeCapitalizationField(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const millions = parseCapitalizationToMillions(text);
  if (!Number.isFinite(millions) || millions <= 0) {
    return null;
  }

  return formatMillionsFr(millions);
}

function normalizeEnterpriseCapitalizations() {
  db.all('SELECT id, capitalization FROM enterprises', (err, rows) => {
    if (err) {
      console.error('Erreur SELECT capitalizations:', err.message);
      return;
    }

    rows.forEach((row) => {
      const normalized = normalizeCapitalizationField(row.capitalization);
      const current = row.capitalization === null || row.capitalization === undefined ? '' : String(row.capitalization).trim();
      const normalizedText = normalized === null ? '' : normalized;
      if (current !== normalizedText) {
        db.run(
          'UPDATE enterprises SET capitalization = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [normalized, row.id],
          (updateErr) => {
            if (updateErr) {
              console.error(`Erreur normalisation capitalization id=${row.id}:`, updateErr.message);
            }
          }
        );
      }
    });
  });
}

function nullIfEmptyText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const text = value.trim();
  return text ? text : null;
}

function sanitizeTextField(value, fieldName) {
  if (typeof value !== 'string') {
    return value;
  }

  let text = value.trim();

  // Répare le mojibake classique UTF-8 lu en latin1 (Ã©, Ã¨, etc.).
  if (/[ÃÂâ€]/.test(text)) {
    try {
      const repaired = Buffer.from(text, 'latin1').toString('utf8');
      if (repaired && !repaired.includes('\uFFFD')) {
        text = repaired;
      }
    } catch (err) {
      // Si la réparation échoue, on garde la valeur brute et la validation ci-dessous gère le cas.
    }
  }

  // U+FFFD indique une perte d'information irrécupérable: on refuse pour éviter de polluer la base.
  if (text.includes('\uFFFD')) {
    const error = new Error(`Encodage invalide detecte dans le champ ${fieldName}. Utilisez une charge utile UTF-8.`);
    error.code = 'INVALID_ENCODING';
    throw error;
  }

  return text;
}

function sanitizeEnterprisePayload(payload) {
  const normalizedCapitalization = normalizeCapitalizationField(payload.capitalization);
  const revenueMillions = parseLocaleNumber(payload.revenue_millions);
  return {
    ...payload,
    name: sanitizeTextField(payload.name, 'name'),
    sector: sanitizeTextField(payload.sector, 'sector'),
    organization_type: normalizeOrganizationType(payload.organization_type),
    country: sanitizeTextField(payload.country, 'country'),
    headquarter_city: sanitizeTextField(payload.headquarter_city, 'headquarter_city'),
    description: sanitizeTextField(payload.description, 'description'),
    website: sanitizeTextField(payload.website, 'website'),
    logo_url: sanitizeTextField(payload.logo_url, 'logo_url'),
    capitalization: normalizedCapitalization,
    funds_raised: nullIfEmptyText(sanitizeTextField(payload.funds_raised, 'funds_raised')),
    revenue_millions: Number.isFinite(revenueMillions) ? revenueMillions : null,
    main_investors: sanitizeTextField(payload.main_investors, 'main_investors'),
    main_competitors: sanitizeTextField(payload.main_competitors, 'main_competitors'),
    participation: sanitizeTextField(payload.participation, 'participation'),
    main_acquisitions: sanitizeTextField(payload.main_acquisitions, 'main_acquisitions'),
    key_resources: sanitizeTextField(payload.key_resources, 'key_resources'),
    strategic_partnerships: sanitizeTextField(payload.strategic_partnerships, 'strategic_partnerships')
  };
}

function normalizeOrganizationType(value) {
  const sanitized = nullIfEmptyText(sanitizeTextField(value, 'organization_type'));
  if (!sanitized) {
    return null;
  }

  const normalized = sanitized
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized === 'publicly traded company' || normalized === 'listed company' || normalized === 'public company' || normalized === 'entreprise cotee en bourse') {
    return 'Publicly traded company';
  }

  if (normalized === 'private company' || normalized === 'entreprise privee') {
    return 'Private company';
  }

  if (normalized === 'subsidiary' || normalized === 'subsidiary company' || normalized === 'filiale') {
    return 'Subsidiary';
  }

  if (normalized === 'b-corp' || normalized === 'b corp' || normalized === 'bcorp') {
    return 'B-Corp';
  }

  if (normalized === 'ngo' || normalized === 'non-governmental organization' || normalized === 'non governmental organization') {
    return 'NGO';
  }

  return sanitized;
}

function parseNullableYear(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return null;
  }

  if (parsed < 1900 || parsed > 3000) {
    return null;
  }

  return parsed;
}

function sanitizePartnershipPayload(payload) {
  return {
    ...payload,
    type_relation: sanitizeTextField(payload.type_relation, 'type_relation'),
    partnership_type: sanitizeTextField(payload.partnership_type, 'partnership_type'),
    description: sanitizeTextField(payload.description, 'description'),
    start_date: sanitizeTextField(payload.start_date, 'start_date'),
    end_year: parseNullableYear(payload.end_year),
    status: sanitizeTextField(payload.status, 'status'),
    sources_information: sanitizeTextField(payload.sources_information, 'sources_information'),
    infra_commitment_text: sanitizeTextField(payload.infra_commitment_text, 'infra_commitment_text')
  };
}

// ===== ROUTES ENTREPRISES =====

function parsePositiveInteger(value, fallback) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseValidationLevel(value, fallback = 0) {
  if (value === true) return 1;
  if (value === false) return 0;

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  if (parsed < 0) return 0;
  if (parsed > 3) return 3;
  return parsed;
}

function parseCapitalizationScore(value) {
  // La valeur est stockée en millions. Score absolu = millions * 1e6 pour trier de façon homogène.
  return parseCapitalizationToMillions(value) * 1_000_000;
}

function parseEnterpriseTopScore(capitalizationValue, fundsRaisedValue) {
  const capitalizationScore = parseCapitalizationScore(capitalizationValue);
  const fundsRaisedScore = parseCapitalizationScore(fundsRaisedValue);
  return Math.max(capitalizationScore, fundsRaisedScore);
}

// Récupérer les entreprises avec pagination
app.get('/api/enterprises', (req, res) => {
  const page = parsePositiveInteger(req.query.page, 1);
  const requestedLimit = parsePositiveInteger(req.query.limit, 50);
  const limit = Math.min(requestedLimit, 100);
  const searchQuery = (req.query.q || '').trim();
  const sectorFilter = (req.query.sector || '').trim();
  const countryFilter = (req.query.country || '').trim();
  const cityFilter = (req.query.city || '').trim();
  const segment = req.query.segment || 'pending';
  const hasSearch = searchQuery.length > 0;
  const searchValue = `%${searchQuery}%`;

  const conditions = [];
  const params = [];

  if (segment === 'pending') {
    conditions.push('IFNULL(is_validated, 0) = 0');
  } else if (segment === 'partial') {
    conditions.push('IFNULL(is_validated, 0) = 1');
  } else if (segment === 'validated') {
    conditions.push('IFNULL(is_validated, 0) = 2');
  } else if (segment === 'later') {
    conditions.push('IFNULL(is_validated, 0) = 3');
  } else if (segment === 'reviewed') {
    conditions.push('IFNULL(is_validated, 0) IN (1, 2, 3)');
  }

  if (hasSearch) {
    conditions.push('(name LIKE ? OR sector LIKE ? OR organization_type LIKE ? OR country LIKE ? OR headquarter_city LIKE ? OR main_investors LIKE ? OR main_competitors LIKE ? OR participation LIKE ? OR main_acquisitions LIKE ? OR key_resources LIKE ? OR strategic_partnerships LIKE ? OR description LIKE ? OR capitalization LIKE ? OR funds_raised LIKE ? OR CAST(revenue_millions AS TEXT) LIKE ?)');
    params.push(searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue);
  }

  if (sectorFilter) {
    conditions.push('(sector = ? OR sector LIKE ? OR sector LIKE ? OR sector LIKE ?)');
    params.push(
      sectorFilter,
      `${sectorFilter}, %`,
      `%, ${sectorFilter}, %`,
      `%, ${sectorFilter}`
    );
  }

  if (countryFilter) {
    conditions.push('LOWER(TRIM(IFNULL(country, ""))) = LOWER(TRIM(?))');
    params.push(countryFilter);
  }

  if (cityFilter) {
    conditions.push('LOWER(TRIM(IFNULL(headquarter_city, ""))) = LOWER(TRIM(?))');
    params.push(cityFilter);
  }

  if (segment === 'top100' || segment === 'top50') {
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    db.all(`SELECT * FROM enterprises ${whereClause}`, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const sorted = rows
        .map((row) => ({
          ...row,
          ranking_score: parseEnterpriseTopScore(row.capitalization, row.funds_raised)
        }))
        .filter((row) => row.ranking_score > 0)
        .sort((a, b) => {
          if (b.ranking_score !== a.ranking_score) {
            return b.ranking_score - a.ranking_score;
          }
          return (a.name || '').localeCompare(b.name || '');
        })
        .slice(0, 200);

      return res.json({
        items: sorted,
        pagination: {
          page: 1,
          limit: 100,
          total: sorted.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      });
    });
    return;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  db.get(`SELECT COUNT(*) as total FROM enterprises ${whereClause}`, params, (countErr, countRow) => {
    if (countErr) {
      return res.status(500).json({ error: countErr.message });
    }

    const total = countRow ? countRow.total : 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const safeOffset = (safePage - 1) * limit;

    db.all(
      `SELECT * FROM enterprises ${whereClause} ORDER BY ${
        segment === 'later' ? `(id * ${SESSION_SEED}) % 999983` : 'name'
      } LIMIT ? OFFSET ?`,
      [...params, limit, safeOffset],
      (err, rows) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          res.json({
            items: rows,
            pagination: {
              page: safePage,
              limit,
              total,
              totalPages,
              hasNextPage: safePage < totalPages,
              hasPreviousPage: safePage > 1
            }
          });
        }
      }
    );
  });
});

app.get('/api/enterprises/filters', (req, res) => {
  const searchQuery = (req.query.q || '').trim();
  const sectorFilter = (req.query.sector || '').trim();
  const countryFilter = (req.query.country || '').trim();
  const cityFilter = (req.query.city || '').trim();
  const hasSearch = searchQuery.length > 0;
  const searchValue = `%${searchQuery}%`;

  const addSectorCondition = (conditions, params, value) => {
    if (!value) return;
    conditions.push('(sector = ? OR sector LIKE ? OR sector LIKE ? OR sector LIKE ?)');
    params.push(
      value,
      `${value}, %`,
      `%, ${value}, %`,
      `%, ${value}`
    );
  };

  const buildWhere = ({ includeSearch, includeSector, includeCountry, includeCity }) => {
    const conditions = [];
    const params = [];

    if (includeSearch && hasSearch) {
      conditions.push('(name LIKE ? OR sector LIKE ? OR country LIKE ? OR headquarter_city LIKE ? OR main_investors LIKE ? OR main_competitors LIKE ? OR participation LIKE ? OR main_acquisitions LIKE ? OR key_resources LIKE ? OR strategic_partnerships LIKE ? OR description LIKE ? OR capitalization LIKE ? OR funds_raised LIKE ? OR CAST(revenue_millions AS TEXT) LIKE ?)');
      params.push(searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue);
    }

    if (includeSector) {
      addSectorCondition(conditions, params, sectorFilter);
    }

    if (includeCountry && countryFilter) {
      conditions.push('LOWER(TRIM(IFNULL(country, ""))) = LOWER(TRIM(?))');
      params.push(countryFilter);
    }

    if (includeCity && cityFilter) {
      conditions.push('LOWER(TRIM(IFNULL(headquarter_city, ""))) = LOWER(TRIM(?))');
      params.push(cityFilter);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params };
  };

  const runQuery = (sql, params) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });

  const sortByCountThenName = (a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.value.localeCompare(b.value);
  };

  const aggregateFromRows = (rows, extractor) => {
    const counts = new Map();

    rows.forEach((row) => {
      const values = extractor(row)
        .map((value) => (value || '').trim())
        .filter(Boolean);

      values.forEach((value) => {
        counts.set(value, (counts.get(value) || 0) + 1);
      });
    });

    return [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort(sortByCountThenName);
  };

  const sectorScope = buildWhere({ includeSearch: true, includeSector: false, includeCountry: true, includeCity: true });
  const countryScope = buildWhere({ includeSearch: true, includeSector: true, includeCountry: false, includeCity: true });
  const cityScope = buildWhere({ includeSearch: true, includeSector: true, includeCountry: true, includeCity: false });

  Promise.all([
    runQuery(`SELECT sector FROM enterprises ${sectorScope.whereClause}`, sectorScope.params),
    runQuery(`SELECT country FROM enterprises ${countryScope.whereClause}`, countryScope.params),
    runQuery(`SELECT headquarter_city FROM enterprises ${cityScope.whereClause}`, cityScope.params)
  ])
    .then(([sectorRows, countryRows, cityRows]) => {
      const sectors = aggregateFromRows(sectorRows, (row) => String(row.sector || '').split(','));
      const countries = aggregateFromRows(countryRows, (row) => [row.country]);
      const cities = aggregateFromRows(cityRows, (row) => [row.headquarter_city]);

      res.json({ sectors, countries, cities });
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
    });
});

// Récupérer la liste légère des entreprises (pour les select)
app.get('/api/enterprises/options', (req, res) => {
  db.all('SELECT id, name FROM enterprises ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Récupérer une entreprise par ID
app.get('/api/enterprises/:id', (req, res) => {
  db.get('SELECT * FROM enterprises WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (row) {
      res.json(row);
    } else {
      res.status(404).json({ error: 'Entreprise non trouvée' });
    }
  });
});

// Créer une nouvelle entreprise
app.post('/api/enterprises', (req, res) => {
  let payload;
  try {
    payload = sanitizeEnterprisePayload(req.body || {});
  } catch (err) {
    if (err.code === 'INVALID_ENCODING') {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }

  const {
    name,
    sector,
    organization_type,
    country,
    headquarter_city,
    founded_year,
    company_status,
    end_year,
    end_reason,
    description,
    website,
    logo_url,
    capitalization,
    funds_raised,
    revenue_millions,
    employees_count,
    main_investors,
    main_competitors,
    participation,
    main_acquisitions,
    key_resources,
    strategic_partnerships,
    is_validated
  } = payload;
  
  if (!name) {
    return res.status(400).json({ error: 'Le nom est requis' });
  }

  db.run(
    `INSERT INTO enterprises (name, sector, organization_type, country, headquarter_city, founded_year, company_status, end_year, end_reason, description, website, logo_url, capitalization, funds_raised, revenue_millions, employees_count, main_investors, main_competitors, participation, main_acquisitions, key_resources, strategic_partnerships, is_validated) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      sector,
      organization_type,
      country,
      headquarter_city,
      founded_year,
      company_status,
      end_year,
      end_reason,
      description,
      website,
      logo_url,
      capitalization,
      funds_raised,
      revenue_millions,
      employees_count,
      main_investors,
      main_competitors,
      participation,
      main_acquisitions,
      key_resources,
      strategic_partnerships,
      parseValidationLevel(is_validated)
    ],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          res.status(400).json({ error: 'Cette entreprise existe déjà' });
        } else {
          res.status(500).json({ error: err.message });
        }
      } else {
        res.json({ id: this.lastID, message: 'Entreprise créée avec succès' });
      }
    }
  );
});

// Mettre à jour une entreprise
app.put('/api/enterprises/:id', (req, res) => {
  let payload;
  try {
    payload = sanitizeEnterprisePayload(req.body || {});
  } catch (err) {
    if (err.code === 'INVALID_ENCODING') {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }

  const {
    name,
    sector,
    organization_type,
    country,
    headquarter_city,
    founded_year,
    company_status,
    end_year,
    end_reason,
    description,
    website,
    logo_url,
    capitalization,
    funds_raised,
    revenue_millions,
    employees_count,
    main_investors,
    main_competitors,
    participation,
    main_acquisitions,
    key_resources,
    strategic_partnerships,
    is_validated
  } = payload;
  
  db.run(
    `UPDATE enterprises 
     SET name = ?, sector = ?, organization_type = ?, country = ?, headquarter_city = ?, founded_year = ?, company_status = ?, end_year = ?, end_reason = ?, description = ?, website = ?, logo_url = ?, capitalization = ?, funds_raised = ?, revenue_millions = ?, employees_count = ?, main_investors = ?, main_competitors = ?, participation = ?, main_acquisitions = ?, key_resources = ?, strategic_partnerships = ?, is_validated = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      name,
      sector,
      organization_type,
      country,
      headquarter_city,
      founded_year,
      company_status,
      end_year,
      end_reason,
      description,
      website,
      logo_url,
      capitalization,
      funds_raised,
      revenue_millions,
      employees_count,
      main_investors,
      main_competitors,
      participation,
      main_acquisitions,
      key_resources,
      strategic_partnerships,
      parseValidationLevel(is_validated),
      req.params.id
    ],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (this.changes === 0) {
        res.status(404).json({ error: 'Entreprise non trouvée' });
      } else {
        res.json({ message: 'Entreprise mise à jour avec succès' });
      }
    }
  );
});

// Mettre a jour uniquement le statut de validation d'une entreprise
app.patch('/api/enterprises/:id/validation', (req, res) => {
  const { is_validated } = req.body;

  const validationLevel = parseValidationLevel(is_validated, -1);
  if (validationLevel < 0 || validationLevel > 3) {
    return res.status(400).json({ error: 'Le champ is_validated doit etre un niveau 0, 1, 2 ou 3' });
  }

  db.run(
    `UPDATE enterprises
     SET is_validated = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [validationLevel, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (this.changes === 0) {
        res.status(404).json({ error: 'Entreprise non trouvee' });
      } else {
        res.json({ message: 'Statut de validation mis a jour avec succes' });
      }
    }
  );
});

// Supprimer une entreprise
app.delete('/api/enterprises/:id', (req, res) => {
  db.run('DELETE FROM enterprises WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Entreprise non trouvée' });
    } else {
      res.json({ message: 'Entreprise supprimée avec succès' });
    }
  });
});

// ===== ROUTES PARTENARIATS =====

// Récupérer tous les partenariats (avec pagination)
app.get('/api/partnerships', (req, res) => {
  const page = parsePositiveInteger(req.query.page, 1);
  const requestedLimit = parsePositiveInteger(req.query.limit, 50);
  const limit = Math.min(requestedLimit, 100);
  const searchQuery = (req.query.q || '').trim();
  const segment = req.query.segment || 'pending';
  const hasSearch = searchQuery.length > 0;
  const searchValue = `%${searchQuery}%`;

  const conditions = [];
  const params = [];

  if (segment === 'pending') {
    conditions.push('IFNULL(p.is_validated, 0) = 0');
  } else if (segment === 'partial') {
    conditions.push('IFNULL(p.is_validated, 0) = 1');
  } else if (segment === 'validated') {
    conditions.push('IFNULL(p.is_validated, 0) = 2');
  } else if (segment === 'later') {
    conditions.push('IFNULL(p.is_validated, 0) = 3');
  } else if (segment === 'reviewed') {
    conditions.push('IFNULL(p.is_validated, 0) IN (1, 2, 3)');
  }

  if (hasSearch) {
    conditions.push('(e1.name LIKE ? OR e2.name LIKE ? OR p.partnership_type LIKE ? OR p.type_relation LIKE ? OR p.description LIKE ? OR p.sources_information LIKE ? OR p.infra_commitment_text LIKE ?)');
    params.push(searchValue, searchValue, searchValue, searchValue, searchValue, searchValue, searchValue);
  }

  const fromClause = `
    FROM partnerships p
    JOIN enterprises e1 ON p.enterprise1_id = e1.id
    JOIN enterprises e2 ON p.enterprise2_id = e2.id
  `;
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  if (segment === 'top100' || segment === 'top50') {
    db.all(
      `SELECT p.*, e1.name as enterprise1_name, e2.name as enterprise2_name,
              e1.name as focal_enterprise_name,
              e2.name as partner_enterprise_name
       ${fromClause}
       ${whereClause}`,
      params,
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const sorted = rows
          .map((row) => ({
            ...row,
            value_score: typeof row.value_millions === 'number' ? row.value_millions : parseFloat(row.value_millions) || 0
          }))
          .filter((row) => row.value_score > 0)
          .sort((a, b) => {
            if (b.value_score !== a.value_score) {
              return b.value_score - a.value_score;
            }
            return (a.enterprise1_name || '').localeCompare(b.enterprise1_name || '');
          })
          .slice(0, 100)
          .map(({ value_score, ...row }) => row);

        return res.json({
          items: sorted,
          pagination: {
            page: 1,
            limit: 100,
            total: sorted.length,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });
      }
    );
    return;
  }

  db.get(
    `SELECT COUNT(*) as total ${fromClause} ${whereClause}`,
    params,
    (countErr, countRow) => {
      if (countErr) {
        return res.status(500).json({ error: countErr.message });
      }

      const total = countRow ? countRow.total : 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const safePage = Math.min(page, totalPages);
      const safeOffset = (safePage - 1) * limit;

      db.all(
        `SELECT p.*, e1.name as enterprise1_name, e2.name as enterprise2_name,
                e1.name as focal_enterprise_name,
                e2.name as partner_enterprise_name
         ${fromClause}
         ${whereClause}
         ORDER BY e1.name, e2.name
         LIMIT ? OFFSET ?`,
        [...params, limit, safeOffset],
        (err, rows) => {
          if (err) {
            res.status(500).json({ error: err.message });
          } else {
            res.json({
              items: rows,
              pagination: {
                page: safePage,
                limit,
                total,
                totalPages,
                hasNextPage: safePage < totalPages,
                hasPreviousPage: safePage > 1
              }
            });
          }
        }
      );
    }
  );
});

// Récupérer les partenaires d'une entreprise
app.get('/api/enterprises/:id/partnerships', (req, res) => {
  db.all(
    `SELECT p.*, 
      CASE WHEN p.enterprise1_id = ? THEN e2.name ELSE e1.name END as partner_name,
      CASE WHEN p.enterprise1_id = ? THEN e2.id ELSE e1.id END as partner_id
     FROM partnerships p
     JOIN enterprises e1 ON p.enterprise1_id = e1.id
     JOIN enterprises e2 ON p.enterprise2_id = e2.id
     WHERE p.enterprise1_id = ? OR p.enterprise2_id = ?`,
    [req.params.id, req.params.id, req.params.id, req.params.id],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json(rows);
      }
    }
  );
});

// Créer un partenariat
app.post('/api/partnerships', (req, res) => {
  let payload;
  try {
    payload = sanitizePartnershipPayload(req.body || {});
  } catch (err) {
    if (err.code === 'INVALID_ENCODING') {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }

  const {
    enterprise1_id,
    type_relation,
    enterprise2_id,
    partnership_type,
    description,
    start_date,
    end_year,
    status,
    sources_information,
    infra_commitment_text,
    value_millions,
    is_validated
  } = payload;
  
  if (!enterprise1_id || !enterprise2_id) {
    return res.status(400).json({ error: 'Les deux entreprises sont requises' });
  }

  if (enterprise1_id === enterprise2_id) {
    return res.status(400).json({ error: 'Une entreprise ne peut pas être partenaire d\'elle-même' });
  }

  const normalizedRelationType = normalizePartnershipType(type_relation || partnership_type);
  const normalizedPartnershipType = normalizePartnershipType(partnership_type || type_relation);

  db.run(
    `INSERT INTO partnerships (enterprise1_id, enterprise2_id, partnership_type, type_relation, description, start_date, end_year, status, sources_information, infra_commitment_text, value_millions, is_validated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      enterprise1_id,
      enterprise2_id,
      normalizedPartnershipType,
      normalizedRelationType,
      description,
      start_date,
      end_year,
      status || 'active',
      sources_information,
      infra_commitment_text,
      value_millions,
      parseValidationLevel(is_validated)
    ],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: this.lastID, message: 'Partenariat créé avec succès' });
      }
    }
  );
});

// Mettre à jour un partenariat
app.put('/api/partnerships/:id', (req, res) => {
  let payload;
  try {
    payload = sanitizePartnershipPayload(req.body || {});
  } catch (err) {
    if (err.code === 'INVALID_ENCODING') {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }

  const { type_relation, partnership_type, description, start_date, end_year, status, sources_information, infra_commitment_text, value_millions, is_validated } = payload;

  const normalizedRelationType = normalizePartnershipType(type_relation || partnership_type);
  const normalizedPartnershipType = normalizePartnershipType(partnership_type || type_relation);
  
  db.run(
    `UPDATE partnerships
     SET partnership_type = ?, type_relation = ?, description = ?, start_date = ?, end_year = ?, status = ?, sources_information = ?, infra_commitment_text = ?, value_millions = ?, is_validated = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      normalizedPartnershipType,
      normalizedRelationType,
      description,
      start_date,
      end_year,
      status,
      sources_information,
      infra_commitment_text,
      value_millions,
      parseValidationLevel(is_validated),
      req.params.id
    ],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (this.changes === 0) {
        res.status(404).json({ error: 'Partenariat non trouvé' });
      } else {
        res.json({ message: 'Partenariat mis à jour avec succès' });
      }
    }
  );
});

// Mettre a jour uniquement le statut de validation d'un partenariat
app.patch('/api/partnerships/:id/validation', (req, res) => {
  const { is_validated } = req.body;

  const validationLevel = parseValidationLevel(is_validated, -1);
  if (validationLevel < 0 || validationLevel > 3) {
    return res.status(400).json({ error: 'Le champ is_validated doit etre un niveau 0, 1, 2 ou 3' });
  }

  db.run(
    `UPDATE partnerships
     SET is_validated = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [validationLevel, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (this.changes === 0) {
        res.status(404).json({ error: 'Partenariat non trouve' });
      } else {
        res.json({ message: 'Statut de validation du partenariat mis a jour avec succes' });
      }
    }
  );
});

// Supprimer un partenariat
app.delete('/api/partnerships/:id', (req, res) => {
  db.run('DELETE FROM partnerships WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Partenariat non trouvé' });
    } else {
      res.json({ message: 'Partenariat supprimé avec succès' });
    }
  });
});

// Démarrer le serveur
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.warn(`Port ${port} déjà utilisé, tentative sur ${nextPort}...`);
      startServer(nextPort);
    } else {
      console.error('Erreur de démarrage du serveur:', err);
      process.exit(1);
    }
  });
}

startServer(Number(process.env.PORT || 3000));
