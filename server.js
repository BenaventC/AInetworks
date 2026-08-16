const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const dbPath = path.join(__dirname, 'database.db');

// Seed aléatoire fixé pour toute la session — nouvel ordre à chaque redémarrage
const SESSION_SEED = Math.floor(Math.random() * 999983) + 1;

const METRIC_HISTORY_ALLOWED_INDICATORS = new Set([
  'capitalization',
  'funds_raised',
  'revenue_millions',
  'profit_millions',
  'rd_expenses_millions',
  'capex_millions',
  'employees_count',
  'community_size'
]);

const METRIC_HISTORY_ALLOWED_UNITS = new Set([
  'usd_m',
  'employees',
  'users',
  'developers',
  'downloads',
  'customers',
  'percent',
  'index'
]);

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
      capitalization REAL,
      funds_raised REAL,
      revenue_millions REAL,
      profit_millions REAL,
      rd_expenses_millions REAL,
      capex_millions REAL,
      employees_count INTEGER,
      community_size INTEGER,
      community_unit TEXT,
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
          db.run('ALTER TABLE enterprises ADD COLUMN funds_raised REAL', (err) => {
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
        if (!columns.has('profit_millions')) {
          db.run('ALTER TABLE enterprises ADD COLUMN profit_millions REAL', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE profit_millions:', err.message);
            }
          });
        }
        if (!columns.has('rd_expenses_millions')) {
          db.run('ALTER TABLE enterprises ADD COLUMN rd_expenses_millions REAL', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE rd_expenses_millions:', err.message);
            }
          });
        }
        if (!columns.has('capex_millions')) {
          db.run('ALTER TABLE enterprises ADD COLUMN capex_millions REAL', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE capex_millions:', err.message);
            }
          });
        }
        if (!columns.has('community_size')) {
          db.run('ALTER TABLE enterprises ADD COLUMN community_size INTEGER', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE community_size:', err.message);
            }
          });
        }
        if (!columns.has('community_unit')) {
          db.run('ALTER TABLE enterprises ADD COLUMN community_unit TEXT', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE community_unit:', err.message);
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
          db.run('UPDATE enterprises SET is_validated = 3 WHERE is_validated IS NULL OR is_validated NOT IN (0, 1, 2, 3)', (err) => {
            if (err) {
              console.error('Erreur UPDATE enterprises.is_validated normalisation:', err.message);
            }
          });

          normalizeEnterpriseFinancialFields();
        };

        if (!columns.has('is_validated')) {
          db.run('ALTER TABLE enterprises ADD COLUMN is_validated INTEGER NOT NULL DEFAULT 3', (err) => {
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

    // Table des investisseurs; keep the schema available on fresh installations too.
    db.run(`CREATE TABLE IF NOT EXISTS investors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sector TEXT,
      country TEXT,
      headquarter_city TEXT,
      founded_year INTEGER,
      description TEXT,
      website TEXT,
      logo_url TEXT,
      capitalization REAL,
      capital_investi REAL,
      revenue_millions REAL,
      employees_count INTEGER,
      main_competitors TEXT,
      participations TEXT,
      acquisitions TEXT,
      key_resources TEXT,
      strategic_partnerships TEXT,
      investor_type TEXT,
      ownership TEXT,
      is_validated INTEGER NOT NULL DEFAULT 3,
      end_year INTEGER,
      end_reason TEXT,
      company_status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Erreur CREATE TABLE investors:', err.message);
        return;
      }

      db.all('PRAGMA table_info(investors)', (pragmaErr, rows) => {
        if (pragmaErr) {
          console.error('Erreur PRAGMA table_info investors:', pragmaErr.message);
          return;
        }

        const columns = new Set(rows.map((row) => row.name));
        if (!columns.has('sector')) {
          db.run('ALTER TABLE investors ADD COLUMN sector TEXT', (alterErr) => {
            if (alterErr && !alterErr.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE investors.sector:', alterErr.message);
            }
          });
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
      is_validated INTEGER NOT NULL DEFAULT 3,
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
          db.run('ALTER TABLE partnerships ADD COLUMN is_validated INTEGER NOT NULL DEFAULT 3', (alterErr) => {
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

    // Table d'historique des indicateurs d'entreprise
    db.run(`CREATE TABLE IF NOT EXISTS enterprise_metrics_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enterprise_name TEXT NOT NULL,
      indicator TEXT NOT NULL,
      year INTEGER NOT NULL,
      value REAL,
      unit TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(enterprise_name, indicator, year)
    )`, (err) => {
      if (err) {
        console.error('Erreur CREATE TABLE enterprise_metrics_history:', err.message);
        return;
      }

      db.all('PRAGMA table_info(enterprise_metrics_history)', (pragmaErr, rows) => {
        if (pragmaErr) {
          console.error('Erreur PRAGMA table_info enterprise_metrics_history:', pragmaErr.message);
          return;
        }

        const columns = new Set(rows.map((row) => row.name));

        if (!columns.has('unit')) {
          db.run('ALTER TABLE enterprise_metrics_history ADD COLUMN unit TEXT', (alterErr) => {
            if (alterErr && !alterErr.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE enterprise_metrics_history.unit:', alterErr.message);
            }
          });
        }

        if (!columns.has('created_at')) {
          db.run('ALTER TABLE enterprise_metrics_history ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP', (alterErr) => {
            if (alterErr && !alterErr.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE enterprise_metrics_history.created_at:', alterErr.message);
            }
          });
        }

        if (!columns.has('updated_at')) {
          db.run('ALTER TABLE enterprise_metrics_history ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP', (alterErr) => {
            if (alterErr && !alterErr.message.includes('duplicate column name')) {
              console.error('Erreur ALTER TABLE enterprise_metrics_history.updated_at:', alterErr.message);
            }
          });
        }
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
    const isThousandsGrouping = /^-?\d{1,3}(,\d{3})+$/.test(text);
    if (isThousandsGrouping) {
      text = text.replace(/,/g, '');
    } else if (/^-?\d+,\d+$/.test(text)) {
      text = text.replace(',', '.');
    } else {
      text = text.replace(/,/g, '');
    }
  } else if (lastDot !== -1) {
    const isThousandsGrouping = /^-?\d{1,3}(\.\d{3})+$/.test(text);
    if (isThousandsGrouping) {
      text = text.replace(/\./g, '');
    } else if (!/^-?\d+\.\d+$/.test(text)) {
      text = text.replace(/\./g, '');
    }
  }

  return Number.parseFloat(text);
}

function parseFinancialToMillions(value, options = {}) {
  const {
    allowNegative = false,
    allowZero = false,
    autoDetectAbsoluteUsd = false,
    absoluteUsdThresholdInMillions = 10_000_000
  } = options;

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }

    if (!allowNegative && value < 0) {
      return null;
    }

    if (!allowZero && value === 0) {
      return null;
    }

    if (allowNegative && !allowZero && value === 0) {
      return null;
    }

    let inMillions = value;
    if (autoDetectAbsoluteUsd && inMillions >= absoluteUsdThresholdInMillions) {
      inMillions = inMillions / 1_000_000;
    }

    return Number(inMillions.toFixed(6));
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/usd|eur|dollars?|euros?/g, '')
    .replace(/[\$€]/g, '')
    .trim();

  const match = normalized.match(/(-?\d[\d\s.,]*)\s*(trillion|trillions|\bt\b|billion|billions|\bbn\b|\bb\b|milliard|milliards|million|millions|\bmn\b|\bm\b|thousand|\bk\b)?/);
  if (!match) {
    return null;
  }

  const numericValue = parseLocaleNumber(match[1]);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  if (!allowNegative && numericValue < 0) {
    return null;
  }

  if (!allowZero && numericValue === 0) {
    return null;
  }

  const unit = match[2] || '';
  const hasUnit = Boolean(unit);
  let multiplier = 1;

  if (unit === 'trillion' || unit === 'trillions' || unit === 't') {
    multiplier = 1_000_000;
  } else if (unit === 'billion' || unit === 'billions' || unit === 'bn' || unit === 'b' || unit === 'milliard' || unit === 'milliards') {
    multiplier = 1_000;
  } else if (unit === 'million' || unit === 'millions' || unit === 'mn' || unit === 'm') {
    multiplier = 1;
  } else if (unit === 'thousand' || unit === 'k') {
    multiplier = 0.001;
  }

  const inMillions = numericValue * multiplier;
  if (!Number.isFinite(inMillions)) {
    return null;
  }

  if (!allowNegative && inMillions < 0) {
    return null;
  }

  if (!allowZero && inMillions === 0) {
    return null;
  }

  let normalizedMillions = inMillions;
  if (autoDetectAbsoluteUsd && !hasUnit && normalizedMillions >= absoluteUsdThresholdInMillions) {
    normalizedMillions = normalizedMillions / 1_000_000;
  }

  return Number(normalizedMillions.toFixed(6));
}

function parseCapitalizationToMillions(value) {
  return parseFinancialToMillions(value);
}

function normalizeMillionsField(value, options = {}) {
  const millions = parseFinancialToMillions(value, options);
  if (!Number.isFinite(millions)) {
    return null;
  }

  return Number(millions.toFixed(6));
}

function normalizeEnterpriseFinancialFields() {
  db.all('SELECT id, capitalization, funds_raised, revenue_millions, profit_millions, rd_expenses_millions, capex_millions FROM enterprises', (err, rows) => {
    if (err) {
      console.error('Erreur SELECT normalisation finance:', err.message);
      return;
    }

    rows.forEach((row) => {
      const normalizedCapitalization = normalizeMillionsField(row.capitalization);
      const normalizedFundsRaised = normalizeMillionsField(row.funds_raised);
      const normalizedRevenue = normalizeMillionsField(row.revenue_millions, { autoDetectAbsoluteUsd: true });
      const normalizedProfit = normalizeMillionsField(row.profit_millions, { allowNegative: true, allowZero: true });
      const normalizedRdExpenses = normalizeMillionsField(row.rd_expenses_millions);
      const normalizedCapex = normalizeMillionsField(row.capex_millions);

      const currentCapitalization = row.capitalization === null || row.capitalization === undefined
        ? null
        : parseLocaleNumber(row.capitalization);
      const currentFundsRaised = row.funds_raised === null || row.funds_raised === undefined
        ? null
        : parseLocaleNumber(row.funds_raised);
      const currentRevenue = row.revenue_millions === null || row.revenue_millions === undefined
        ? null
        : parseLocaleNumber(row.revenue_millions);
      const currentProfit = row.profit_millions === null || row.profit_millions === undefined
        ? null
        : parseLocaleNumber(row.profit_millions);
      const currentRdExpenses = row.rd_expenses_millions === null || row.rd_expenses_millions === undefined
        ? null
        : parseLocaleNumber(row.rd_expenses_millions);
      const currentCapex = row.capex_millions === null || row.capex_millions === undefined
        ? null
        : parseLocaleNumber(row.capex_millions);

      const hasCapitalizationRaw = row.capitalization !== null && row.capitalization !== undefined && String(row.capitalization).trim() !== '';
      const hasFundsRaisedRaw = row.funds_raised !== null && row.funds_raised !== undefined && String(row.funds_raised).trim() !== '';
      const hasRevenueRaw = row.revenue_millions !== null && row.revenue_millions !== undefined && String(row.revenue_millions).trim() !== '';
      const hasProfitRaw = row.profit_millions !== null && row.profit_millions !== undefined && String(row.profit_millions).trim() !== '';
      const hasRdExpensesRaw = row.rd_expenses_millions !== null && row.rd_expenses_millions !== undefined && String(row.rd_expenses_millions).trim() !== '';
      const hasCapexRaw = row.capex_millions !== null && row.capex_millions !== undefined && String(row.capex_millions).trim() !== '';

      const shouldRewriteCapitalization = typeof row.capitalization === 'string' && (normalizedCapitalization !== null || hasCapitalizationRaw);
      const shouldRewriteFundsRaised = typeof row.funds_raised === 'string' && (normalizedFundsRaised !== null || hasFundsRaisedRaw);
      const shouldRewriteRevenue = typeof row.revenue_millions === 'string' && (normalizedRevenue !== null || hasRevenueRaw);
      const shouldRewriteProfit = typeof row.profit_millions === 'string' && (normalizedProfit !== null || hasProfitRaw);
      const shouldRewriteRdExpenses = typeof row.rd_expenses_millions === 'string' && (normalizedRdExpenses !== null || hasRdExpensesRaw);
      const shouldRewriteCapex = typeof row.capex_millions === 'string' && (normalizedCapex !== null || hasCapexRaw);

      const changed =
        (Number.isFinite(currentCapitalization) ? Number(currentCapitalization.toFixed(6)) : null) !== normalizedCapitalization ||
        (Number.isFinite(currentFundsRaised) ? Number(currentFundsRaised.toFixed(6)) : null) !== normalizedFundsRaised ||
        (Number.isFinite(currentRevenue) ? Number(currentRevenue.toFixed(6)) : null) !== normalizedRevenue ||
        (Number.isFinite(currentProfit) ? Number(currentProfit.toFixed(6)) : null) !== normalizedProfit ||
        (Number.isFinite(currentRdExpenses) ? Number(currentRdExpenses.toFixed(6)) : null) !== normalizedRdExpenses ||
        (Number.isFinite(currentCapex) ? Number(currentCapex.toFixed(6)) : null) !== normalizedCapex ||
        shouldRewriteCapitalization ||
        shouldRewriteFundsRaised ||
        shouldRewriteRevenue ||
        shouldRewriteProfit ||
        shouldRewriteRdExpenses ||
        shouldRewriteCapex;

      if (changed) {
        db.run(
          'UPDATE enterprises SET capitalization = ?, funds_raised = ?, revenue_millions = ?, profit_millions = ?, rd_expenses_millions = ?, capex_millions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [normalizedCapitalization, normalizedFundsRaised, normalizedRevenue, normalizedProfit, normalizedRdExpenses, normalizedCapex, row.id],
          (updateErr) => {
            if (updateErr) {
              console.error(`Erreur normalisation finance id=${row.id}:`, updateErr.message);
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
  const sanitizedCapitalization = sanitizeTextField(payload.capitalization, 'capitalization');
  const sanitizedFundsRaised = sanitizeTextField(payload.funds_raised, 'funds_raised');
  const sanitizedRevenueMillions = sanitizeTextField(payload.revenue_millions, 'revenue_millions');
  const sanitizedProfitMillions = sanitizeTextField(payload.profit_millions, 'profit_millions');
  const sanitizedRdExpensesMillions = sanitizeTextField(payload.rd_expenses_millions, 'rd_expenses_millions');
  const sanitizedCapexMillions = sanitizeTextField(payload.capex_millions, 'capex_millions');

  const normalizedCapitalization = normalizeMillionsField(sanitizedCapitalization);
  const normalizedFundsRaised = normalizeMillionsField(sanitizedFundsRaised);
  const normalizedRevenueMillions = normalizeMillionsField(sanitizedRevenueMillions, { autoDetectAbsoluteUsd: true });
  const normalizedProfitMillions = normalizeMillionsField(sanitizedProfitMillions, { allowNegative: true, allowZero: true });
  const normalizedRdExpensesMillions = normalizeMillionsField(sanitizedRdExpensesMillions);
  const normalizedCapexMillions = normalizeMillionsField(sanitizedCapexMillions);
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
    funds_raised: normalizedFundsRaised,
    revenue_millions: normalizedRevenueMillions,
    profit_millions: normalizedProfitMillions,
    rd_expenses_millions: normalizedRdExpensesMillions,
    capex_millions: normalizedCapexMillions,
    community_unit: normalizeCommunityUnit(payload.community_unit),
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

  if (normalized === 'investor' || normalized === 'investment firm' || normalized === 'venture capital' || normalized === 'vc' || normalized === 'fonds d\'investissement') {
    return 'Investor';
  }

  return sanitized;
}

function normalizeCommunityUnit(value) {
  const sanitized = nullIfEmptyText(sanitizeTextField(value, 'community_unit'));
  if (!sanitized) {
    return null;
  }

  const normalized = sanitized
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (normalized === 'user' || normalized === 'users') {
    return 'user';
  }
  if (normalized === 'developer' || normalized === 'developers') {
    return 'developers';
  }
  if (normalized === 'download' || normalized === 'downloads') {
    return 'download';
  }
  if (normalized === 'customer' || normalized === 'customers') {
    return 'customer';
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

function sanitizeEnterpriseMetricHistoryPayload(payload) {
  const indicator = normalizeMetricHistoryIndicator(payload.indicator);
  const unit = normalizeMetricHistoryUnit(payload.unit);
  const year = parseNullableYear(payload.year);

  let value = null;
  if (payload.value !== null && payload.value !== undefined && payload.value !== '') {
    if (typeof payload.value === 'number') {
      value = Number.isFinite(payload.value) ? payload.value : null;
    } else {
      const parsedValue = parseLocaleNumber(payload.value);
      value = Number.isFinite(parsedValue) ? parsedValue : null;
    }
  }

  return {
    indicator,
    unit,
    year,
    value
  };
}

function normalizeMetricHistoryIndicator(value) {
  const sanitized = nullIfEmptyText(sanitizeTextField(value, 'indicator'));
  if (!sanitized) {
    return null;
  }

  const normalized = sanitized
    .toLowerCase()
    .trim();

  if (METRIC_HISTORY_ALLOWED_INDICATORS.has(normalized)) {
    return normalized;
  }

  return sanitized;
}

function normalizeMetricHistoryUnit(value) {
  const sanitized = nullIfEmptyText(sanitizeTextField(value, 'unit'));
  if (!sanitized) {
    return null;
  }

  const normalized = sanitized
    .toLowerCase()
    .replace(/\s+/g, '_')
    .trim();

  if (METRIC_HISTORY_ALLOWED_UNITS.has(normalized)) {
    return normalized;
  }

  return sanitized;
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
  const millions = parseCapitalizationToMillions(value);
  return Number.isFinite(millions) ? millions * 1_000_000 : 0;
}

function parseEnterpriseTopScore(capitalizationValue, fundsRaisedValue) {
  const capitalizationScore = parseCapitalizationScore(capitalizationValue);
  const fundsRaisedScore = parseCapitalizationScore(fundsRaisedValue);
  return Math.max(capitalizationScore, fundsRaisedScore);
}

function isEnterpriseTop100Candidate(row) {
  const capMillions = parseCapitalizationToMillions(row.capitalization);
  const fundsMillions = parseCapitalizationToMillions(row.funds_raised);

  const hasLargeCap = Number.isFinite(capMillions) && capMillions > 100;
  const hasMeaningfulFunds = Number.isFinite(fundsMillions) && fundsMillions > 10;

  return hasLargeCap || hasMeaningfulFunds;
}

function buildTop100EligibilitySqlClause() {
  return '(IFNULL(CAST(capitalization AS REAL), 0) > 100 OR IFNULL(CAST(funds_raised AS REAL), 0) > 10)';
}

function hasEmptyCompetitorsField(value) {
  return !String(value || '').trim();
}

function shouldIncludeCompetitionWithoutEnterprise(row) {
  return String(row.main_competitors || '').trim().length < 5;
}

function sortCompetitionWithoutEnterprises(a, b) {
  const capA = parseCapitalizationToMillions(a.capitalization);
  const capB = parseCapitalizationToMillions(b.capitalization);
  if (capB !== capA) {
    return capB - capA;
  }

  const fundsA = parseCapitalizationToMillions(a.funds_raised);
  const fundsB = parseCapitalizationToMillions(b.funds_raised);
  if (fundsB !== fundsA) {
    return fundsB - fundsA;
  }

  return (a.name || '').localeCompare(b.name || '');
}

function sortEnterprisesForValidation(a, b) {
  const capA = parseCapitalizationToMillions(a.capitalization);
  const capB = parseCapitalizationToMillions(b.capitalization);
  const capAHasValue = Number.isFinite(capA);
  const capBHasValue = Number.isFinite(capB);

  if (capAHasValue !== capBHasValue) {
    return capAHasValue ? -1 : 1;
  }
  if (capAHasValue && capBHasValue && capB !== capA) {
    return capB - capA;
  }

  const fundsA = parseCapitalizationToMillions(a.funds_raised);
  const fundsB = parseCapitalizationToMillions(b.funds_raised);
  const fundsAHasValue = Number.isFinite(fundsA);
  const fundsBHasValue = Number.isFinite(fundsB);

  if (fundsAHasValue !== fundsBHasValue) {
    return fundsAHasValue ? -1 : 1;
  }
  if (fundsAHasValue && fundsBHasValue && fundsB !== fundsA) {
    return fundsB - fundsA;
  }

  const employeesA = Number(a.employees_count) || 0;
  const employeesB = Number(b.employees_count) || 0;
  const employeesAHasValue = Number.isFinite(employeesA) && employeesA > 0;
  const employeesBHasValue = Number.isFinite(employeesB) && employeesB > 0;

  if (employeesAHasValue !== employeesBHasValue) {
    return employeesAHasValue ? -1 : 1;
  }
  if (employeesAHasValue && employeesBHasValue && employeesB !== employeesA) {
    return employeesB - employeesA;
  }

  const revenueA = parseCapitalizationToMillions(a.revenue_millions);
  const revenueB = parseCapitalizationToMillions(b.revenue_millions);
  const revenueAHasValue = Number.isFinite(revenueA);
  const revenueBHasValue = Number.isFinite(revenueB);

  if (revenueAHasValue !== revenueBHasValue) {
    return revenueAHasValue ? -1 : 1;
  }
  if (revenueAHasValue && revenueBHasValue && revenueB !== revenueA) {
    return revenueB - revenueA;
  }

  return (a.name || '').localeCompare(b.name || '');
}

function buildEnterpriseSearchClause(searchQuery, searchMode = 'name') {
  const trimmedQuery = String(searchQuery || '').trim();
  if (!trimmedQuery) {
    return null;
  }

  if (searchMode === 'anything') {
    const searchableFields = [
      'name', 'sector', 'organization_type', 'country', 'headquarter_city',
      'description', 'website', 'logo_url', 'main_investors', 'main_competitors',
      'participation', 'main_acquisitions', 'key_resources', 'strategic_partnerships',
      'company_status', 'end_reason'
    ];
    return {
      clause: `(${searchableFields.map((field) => `LOWER(IFNULL(${field}, "")) LIKE LOWER(?)`).join(' OR ')})`,
      params: searchableFields.map(() => `%${trimmedQuery}%`)
    };
  }

  const compactQuery = trimmedQuery
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  return {
    clause: '(LOWER(TRIM(IFNULL(name, ""))) LIKE LOWER(TRIM(?)) OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(IFNULL(name, "")), " ", ""), "-", ""), ".", ""), ",", ""), char(39), "")) LIKE ?)',
    params: [`${trimmedQuery}%`, `${compactQuery}%`]
  };
}

// Récupérer les entreprises avec pagination
app.get('/api/enterprises', (req, res) => {
  const page = parsePositiveInteger(req.query.page, 1);
  const requestedLimit = parsePositiveInteger(req.query.limit, 25);
  const limit = Math.min(requestedLimit, 100);
  const searchQuery = (req.query.q || '').trim();
  const anythingQuery = (req.query.anything || '').trim();
  const sectorFilter = (req.query.sector || '').trim();
  const countryFilter = (req.query.country || '').trim();
  const segment = req.query.segment || 'pending';
  const orgTypeFilter = (req.query.orgType || '').trim();

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
  } else if (segment === 'investor') {
    conditions.push("organization_type = 'Investor'");
  } else if (segment === 'reviewed') {
    conditions.push('IFNULL(is_validated, 0) IN (1, 2, 3)');
  }

  if (orgTypeFilter) {
    conditions.push('organization_type = ?');
    params.push(orgTypeFilter);
  }

  const enterpriseSearch = buildEnterpriseSearchClause(searchQuery, 'name');
  if (enterpriseSearch) {
    conditions.push(enterpriseSearch.clause);
    params.push(...enterpriseSearch.params);
  }
  const anythingSearch = buildEnterpriseSearchClause(anythingQuery, 'anything');
  if (anythingSearch) {
    conditions.push(anythingSearch.clause);
    params.push(...anythingSearch.params);
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

  if (segment === 'top100') {
    const topClause = buildTop100EligibilitySqlClause();
    const topConditions = [...conditions, topClause];
    const whereClause = topConditions.length > 0 ? `WHERE ${topConditions.join(' AND ')}` : '';

    db.get(`SELECT COUNT(*) as total FROM enterprises ${whereClause}`, params, (countErr, countRow) => {
      if (countErr) {
        return res.status(500).json({ error: countErr.message });
      }

      const total = countRow ? countRow.total : 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const safePage = Math.min(page, totalPages);
      const safeOffset = (safePage - 1) * limit;

      db.all(
        `SELECT *,
                CASE
                  WHEN IFNULL(CAST(capitalization AS REAL), 0) >= IFNULL(CAST(funds_raised AS REAL), 0)
                    THEN IFNULL(CAST(capitalization AS REAL), 0)
                  ELSE IFNULL(CAST(funds_raised AS REAL), 0)
                END AS ranking_score
         FROM enterprises
         ${whereClause}
         ORDER BY ranking_score DESC, name
         LIMIT ? OFFSET ?`,
        [...params, limit, safeOffset],
        (err, rows) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          return res.json({
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
      );
    });
    return;
  }

  if (segment === 'top50' || segment === 'companieswithoutcompetitors') {
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    db.all(`SELECT * FROM enterprises ${whereClause}`, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      let sorted;

      if (segment === 'companieswithoutcompetitors') {
        sorted = rows
          .filter(shouldIncludeCompetitionWithoutEnterprise)
          .sort(sortCompetitionWithoutEnterprises);
      } else {
        sorted = rows
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
          });

        if (segment === 'top50') {
          sorted = sorted.slice(0, 50);
        }
      }

      const total = sorted.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const safePage = Math.min(page, totalPages);
      const safeOffset = (safePage - 1) * limit;
      const pageItems = segment === 'top50'
        ? sorted.slice(0, 50)
        : sorted.slice(safeOffset, safeOffset + limit);

      return res.json({
        items: pageItems,
        pagination: {
          page: segment === 'top50' ? 1 : safePage,
          limit: segment === 'top50' ? 50 : limit,
          total,
          totalPages: segment === 'top50' ? 1 : totalPages,
          hasNextPage: segment === 'top50' ? false : safePage < totalPages,
          hasPreviousPage: segment === 'top50' ? false : safePage > 1
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

    const fetchRows = (orderClause) => {
      db.all(
        `SELECT * FROM enterprises ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
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
    };

    if (segment === 'pending' || segment === 'partial' || segment === 'validated' || segment === 'reviewed' || segment === 'later' || segment === 'investor') {
      db.all(`SELECT * FROM enterprises ${whereClause}`, params, (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const sortFn = (segment === 'later' || segment === 'investor')
          ? (a, b) => (a.name || '').localeCompare(b.name || '')
          : sortEnterprisesForValidation;
        const sortedRows = [...rows].sort(sortFn);
        const pageItems = sortedRows.slice(safeOffset, safeOffset + limit);

        res.json({
          items: pageItems,
          pagination: {
            page: safePage,
            limit,
            total,
            totalPages,
            hasNextPage: safePage < totalPages,
            hasPreviousPage: safePage > 1
          }
        });
      });
      return;
    }

    fetchRows('ORDER BY name');
  });
});

app.get('/api/enterprises/counts', (req, res) => {
  const searchQuery = (req.query.q || '').trim();
  const anythingQuery = (req.query.anything || '').trim();
  const sectorFilter = (req.query.sector || '').trim();
  const countryFilter = (req.query.country || '').trim();
  const orgTypeFilter = (req.query.orgType || '').trim();

  const conditions = [];
  const params = [];

  if (orgTypeFilter) {
    conditions.push('organization_type = ?');
    params.push(orgTypeFilter);
  }

  const enterpriseSearch = buildEnterpriseSearchClause(searchQuery, 'name');
  if (enterpriseSearch) {
    conditions.push(enterpriseSearch.clause);
    params.push(...enterpriseSearch.params);
  }
  const anythingSearch = buildEnterpriseSearchClause(anythingQuery, 'anything');
  if (anythingSearch) {
    conditions.push(anythingSearch.clause);
    params.push(...anythingSearch.params);
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

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const runGet = (sql, queryParams = []) => new Promise((resolve, reject) => {
    db.get(sql, queryParams, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || {});
      }
    });
  });

  const runAll = (sql, queryParams = []) => new Promise((resolve, reject) => {
    db.all(sql, queryParams, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });

  Promise.all([
    runGet(
      `SELECT
        SUM(CASE WHEN IFNULL(is_validated, 0) = 0 THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN IFNULL(is_validated, 0) = 1 THEN 1 ELSE 0 END) AS partial,
        SUM(CASE WHEN IFNULL(is_validated, 0) = 2 THEN 1 ELSE 0 END) AS validated,
        SUM(CASE WHEN IFNULL(is_validated, 0) = 3 THEN 1 ELSE 0 END) AS later,
        SUM(CASE WHEN organization_type = 'Investor' THEN 1 ELSE 0 END) AS investor,
        SUM(CASE WHEN LENGTH(TRIM(IFNULL(main_competitors, ""))) < 5 THEN 1 ELSE 0 END) AS companieswithoutcompetitors,
        SUM(CASE WHEN ${buildTop100EligibilitySqlClause()} THEN 1 ELSE 0 END) AS top100
       FROM enterprises
       ${whereClause}`,
      params
    )
  ])
    .then(([validatedCounts]) => {
      res.json({
        pending: validatedCounts.pending || 0,
        partial: validatedCounts.partial || 0,
        validated: validatedCounts.validated || 0,
        later: validatedCounts.later || 0,
        investor: validatedCounts.investor || 0,
        companieswithoutcompetitors: validatedCounts.companieswithoutcompetitors || 0,
        top100: validatedCounts.top100 || 0
      });
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
    });
});

app.get('/api/enterprises/filters', (req, res) => {
  const searchQuery = (req.query.q || '').trim();
  const anythingQuery = (req.query.anything || '').trim();
  const sectorFilter = (req.query.sector || '').trim();
  const countryFilter = (req.query.country || '').trim();

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

  const buildWhere = ({ includeSearch, includeSector, includeCountry }) => {
    const conditions = [];
    const params = [];

    if (includeSearch) {
      const enterpriseSearch = buildEnterpriseSearchClause(searchQuery, 'name');
      if (enterpriseSearch) {
        conditions.push(enterpriseSearch.clause);
        params.push(...enterpriseSearch.params);
      }
      const anythingSearch = buildEnterpriseSearchClause(anythingQuery, 'anything');
      if (anythingSearch) {
        conditions.push(anythingSearch.clause);
        params.push(...anythingSearch.params);
      }
    }

    if (includeSector) {
      addSectorCondition(conditions, params, sectorFilter);
    }

    if (includeCountry && countryFilter) {
      conditions.push('LOWER(TRIM(IFNULL(country, ""))) = LOWER(TRIM(?))');
      params.push(countryFilter);
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

  const sectorScope = buildWhere({ includeSearch: true, includeSector: false, includeCountry: true });
  const countryScope = buildWhere({ includeSearch: true, includeSector: true, includeCountry: false });

  Promise.all([
    runQuery(`SELECT sector FROM enterprises ${sectorScope.whereClause}`, sectorScope.params),
    runQuery(`SELECT country FROM enterprises ${countryScope.whereClause}`, countryScope.params)
  ])
    .then(([sectorRows, countryRows]) => {
      const sectors = aggregateFromRows(sectorRows, (row) => String(row.sector || '').split(','));
      const countries = aggregateFromRows(countryRows, (row) => [row.country]);

      res.json({ sectors, countries });
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

app.get('/api/enterprises/:id/metrics-history', (req, res) => {
  db.get('SELECT name FROM enterprises WHERE id = ?', [req.params.id], (enterpriseErr, enterpriseRow) => {
    if (enterpriseErr) {
      return res.status(500).json({ error: enterpriseErr.message });
    }

    if (!enterpriseRow) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    db.all(
      `SELECT id, enterprise_name, indicator, year, value, unit, created_at, updated_at
       FROM enterprise_metrics_history
       WHERE LOWER(TRIM(enterprise_name)) = LOWER(TRIM(?))
       ORDER BY indicator ASC, year DESC`,
      [enterpriseRow.name],
      (historyErr, rows) => {
        if (historyErr) {
          return res.status(500).json({ error: historyErr.message });
        }

        return res.json({
          enterprise_name: enterpriseRow.name,
          items: rows || []
        });
      }
    );
  });
});

app.post('/api/enterprises/:id/metrics-history', (req, res) => {
  db.get('SELECT name FROM enterprises WHERE id = ?', [req.params.id], (enterpriseErr, enterpriseRow) => {
    if (enterpriseErr) {
      return res.status(500).json({ error: enterpriseErr.message });
    }

    if (!enterpriseRow) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    let payload;
    try {
      payload = sanitizeEnterpriseMetricHistoryPayload(req.body || {});
    } catch (err) {
      if (err.code === 'INVALID_ENCODING') {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message });
    }

    if (!payload.indicator) {
      return res.status(400).json({ error: 'Le champ indicator est requis' });
    }

    if (!METRIC_HISTORY_ALLOWED_INDICATORS.has(payload.indicator)) {
      return res.status(400).json({
        error: `Indicator invalide. Valeurs autorisées: ${[...METRIC_HISTORY_ALLOWED_INDICATORS].join(', ')}`
      });
    }

    if (!payload.unit) {
      return res.status(400).json({ error: 'Le champ unit est requis' });
    }

    if (!METRIC_HISTORY_ALLOWED_UNITS.has(payload.unit)) {
      return res.status(400).json({
        error: `Unit invalide. Valeurs autorisées: ${[...METRIC_HISTORY_ALLOWED_UNITS].join(', ')}`
      });
    }

    if (!payload.year) {
      return res.status(400).json({ error: 'Le champ year est requis et doit être valide' });
    }

    if (payload.value === null) {
      return res.status(400).json({ error: 'Le champ value est requis et doit être numérique' });
    }

    db.run(
      `INSERT INTO enterprise_metrics_history (enterprise_name, indicator, year, value, unit, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(enterprise_name, indicator, year)
       DO UPDATE SET value = excluded.value, unit = excluded.unit, updated_at = CURRENT_TIMESTAMP`,
      [enterpriseRow.name, payload.indicator, payload.year, payload.value, payload.unit],
      (saveErr) => {
        if (saveErr) {
          return res.status(500).json({ error: saveErr.message });
        }

        return res.json({ message: 'Historique indicateur enregistré avec succès' });
      }
    );
  });
});

app.delete('/api/enterprises/:id/metrics-history/:metricId', (req, res) => {
  db.get('SELECT name FROM enterprises WHERE id = ?', [req.params.id], (enterpriseErr, enterpriseRow) => {
    if (enterpriseErr) {
      return res.status(500).json({ error: enterpriseErr.message });
    }

    if (!enterpriseRow) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    db.run(
      `DELETE FROM enterprise_metrics_history
       WHERE id = ? AND LOWER(TRIM(enterprise_name)) = LOWER(TRIM(?))`,
      [req.params.metricId, enterpriseRow.name],
      function(deleteErr) {
        if (deleteErr) {
          return res.status(500).json({ error: deleteErr.message });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Entrée historique non trouvée' });
        }

        return res.json({ message: 'Entrée historique supprimée avec succès' });
      }
    );
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
    profit_millions,
    rd_expenses_millions,
    capex_millions,
    employees_count,
    community_size,
    community_unit,
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
    `INSERT INTO enterprises (name, sector, organization_type, country, headquarter_city, founded_year, company_status, end_year, end_reason, description, website, logo_url, capitalization, funds_raised, revenue_millions, profit_millions, rd_expenses_millions, capex_millions, employees_count, community_size, community_unit, main_investors, main_competitors, participation, main_acquisitions, key_resources, strategic_partnerships, is_validated) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      profit_millions,
      rd_expenses_millions,
      capex_millions,
      employees_count,
      community_size,
      community_unit,
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
    profit_millions,
    rd_expenses_millions,
    capex_millions,
    employees_count,
    community_size,
    community_unit,
    main_investors,
    main_competitors,
    participation,
    main_acquisitions,
    key_resources,
    strategic_partnerships,
    is_validated
  } = payload;
  
  db.get('SELECT name FROM enterprises WHERE id = ?', [req.params.id], (lookupErr, existingEnterprise) => {
    if (lookupErr) {
      return res.status(500).json({ error: lookupErr.message });
    }

    if (!existingEnterprise) {
      return res.status(404).json({ error: 'Entreprise non trouvée' });
    }

    db.run(
      `UPDATE enterprises 
      SET name = ?, sector = ?, organization_type = ?, country = ?, headquarter_city = ?, founded_year = ?, company_status = ?, end_year = ?, end_reason = ?, description = ?, website = ?, logo_url = ?, capitalization = ?, funds_raised = ?, revenue_millions = ?, profit_millions = ?, rd_expenses_millions = ?, capex_millions = ?, employees_count = ?, community_size = ?, community_unit = ?, main_investors = ?, main_competitors = ?, participation = ?, main_acquisitions = ?, key_resources = ?, strategic_partnerships = ?, is_validated = ?, updated_at = CURRENT_TIMESTAMP
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
        profit_millions,
        rd_expenses_millions,
        capex_millions,
        employees_count,
        community_size,
        community_unit,
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
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Entreprise non trouvée' });
        }

        const previousName = existingEnterprise.name;
        if (!previousName || !name || previousName === name) {
          return res.json({ message: 'Entreprise mise à jour avec succès' });
        }

        db.run(
          `UPDATE enterprise_metrics_history
           SET enterprise_name = ?, updated_at = CURRENT_TIMESTAMP
           WHERE LOWER(TRIM(enterprise_name)) = LOWER(TRIM(?))`,
          [name, previousName],
          (historyErr) => {
            if (historyErr) {
              return res.status(500).json({ error: historyErr.message });
            }

            return res.json({ message: 'Entreprise mise à jour avec succès' });
          }
        );
      }
    );
  });
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

// ===== ROUTES INVESTORS =====

app.get('/api/investors', (req, res) => {
  const page = parsePositiveInteger(req.query.page, 1);
  const limit = Math.min(parsePositiveInteger(req.query.limit, 50), 100);
  const searchQuery = (req.query.q || '').trim();
  const segment = req.query.segment || 'later';

  const conditions = [];
  const params = [];

  if (segment === 'pending')   conditions.push('IFNULL(is_validated,0) = 0');
  else if (segment === 'partial')   conditions.push('IFNULL(is_validated,0) = 1');
  else if (segment === 'validated') conditions.push('IFNULL(is_validated,0) = 2');
  else if (segment === 'later') conditions.push('IFNULL(is_validated,0) = 3');

  if (searchQuery) {
    conditions.push('(name LIKE ? OR description LIKE ? OR country LIKE ?)');
    const v = `%${searchQuery}%`;
    params.push(v, v, v);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  db.get(`SELECT COUNT(*) as total FROM investors ${where}`, params, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const total = row.total;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;

    db.all(
      `SELECT * FROM investors ${where} ORDER BY name LIMIT ? OFFSET ?`,
      [...params, limit, offset],
      (err2, rows) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({
          items: rows,
          pagination: { page: safePage, limit, total, totalPages,
            hasNextPage: safePage < totalPages, hasPreviousPage: safePage > 1 }
        });
      }
    );
  });
});

app.get('/api/investors/counts', (req, res) => {
  const searchQuery = (req.query.q || '').trim();
  const conditions = [];
  const params = [];
  if (searchQuery) {
    conditions.push('(name LIKE ? OR description LIKE ? OR country LIKE ?)');
    const v = `%${searchQuery}%`;
    params.push(v, v, v);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  db.get(`SELECT
    SUM(CASE WHEN IFNULL(is_validated,0) = 0 THEN 1 ELSE 0 END) AS pending,
    SUM(CASE WHEN IFNULL(is_validated,0) = 1 THEN 1 ELSE 0 END) AS partial,
    SUM(CASE WHEN IFNULL(is_validated,0) = 2 THEN 1 ELSE 0 END) AS validated,
    SUM(CASE WHEN IFNULL(is_validated,0) = 3 THEN 1 ELSE 0 END) AS later,
    COUNT(*) AS total
    FROM investors ${where}`, params, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || { pending:0, partial:0, validated:0, later:0, total:0 });
  });
});

app.get('/api/investors/:id', (req, res) => {
  db.get('SELECT * FROM investors WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Investor non trouvé' });
    res.json(row);
  });
});

app.post('/api/investors', (req, res) => {
  const {
    name, description, country, sector, headquarter_city, founded_year, website, logo_url,
    capitalization, capital_investi, revenue_millions, employees_count, main_competitors,
    participations, acquisitions, key_resources, strategic_partnerships,
    investor_type, ownership, is_validated, end_year, end_reason, company_status
  } = req.body;
  if (!name) return res.status(400).json({ error: 'name requis' });
  db.run(
    `INSERT INTO investors (
      name, description, country, sector, headquarter_city, founded_year, website, logo_url,
      capitalization, capital_investi, revenue_millions, employees_count, main_competitors,
      participations, acquisitions, key_resources, strategic_partnerships, investor_type,
      ownership, is_validated, end_year, end_reason, company_status, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
    [
      name, description || null, country || null, sector || null, headquarter_city || null,
      founded_year || null, website || null, logo_url || null, capitalization ?? null,
      capital_investi ?? null, revenue_millions ?? null, employees_count ?? null,
      main_competitors || null, participations || null, acquisitions || null,
      key_resources || null, strategic_partnerships || null, investor_type || null,
      ownership || null, parseValidationLevel(is_validated, 3), end_year || null,
      end_reason || null, company_status || null
    ],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID });
    }
  );
});

app.patch('/api/investors/:id', (req, res) => {
  const allowed = ['name','description','country','headquarter_city','website','logo_url',
    'capitalization','capital_investi','employees_count','participations','acquisitions','key_resources',
    'main_competitors','strategic_partnerships','is_validated','company_status','investor_type','ownership'];
  const updates = [];
  const params = [];
  for (const field of allowed) {
    if (field in req.body) {
      updates.push(`${field} = ?`);
      params.push(field === 'is_validated' ? parseValidationLevel(req.body[field], 3) : req.body[field]);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'Aucun champ à modifier' });
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);
  db.run(`UPDATE investors SET ${updates.join(', ')} WHERE id = ?`, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (!this.changes) return res.status(404).json({ error: 'Investor non trouvé' });
    res.json({ message: 'Investor mis à jour' });
  });
});

app.patch('/api/investors/:id/validation', (req, res) => {
  const level = parseValidationLevel(req.body.is_validated, -1);
  if (level < 0 || level > 3) return res.status(400).json({ error: 'is_validated doit être 0-3' });
  db.run('UPDATE investors SET is_validated=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [level, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (!this.changes) return res.status(404).json({ error: 'Investor non trouvé' });
    res.json({ message: 'Validation mise à jour' });
  });
});

app.delete('/api/investors/:id', (req, res) => {
  db.run('DELETE FROM investors WHERE id=?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (!this.changes) return res.status(404).json({ error: 'Investor non trouvé' });
    res.json({ message: 'Investor supprimé' });
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

app.get('/api/partnerships/counts', (req, res) => {
  const searchQuery = (req.query.q || '').trim();
  const hasSearch = searchQuery.length > 0;
  const searchValue = `%${searchQuery}%`;

  const conditions = [];
  const params = [];

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

  db.get(
    `SELECT
      SUM(CASE WHEN IFNULL(p.is_validated, 0) = 0 THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN IFNULL(p.is_validated, 0) = 1 THEN 1 ELSE 0 END) AS partial,
      SUM(CASE WHEN IFNULL(p.is_validated, 0) = 2 THEN 1 ELSE 0 END) AS validated,
      SUM(CASE WHEN IFNULL(p.is_validated, 0) = 3 THEN 1 ELSE 0 END) AS later,
      SUM(CASE WHEN CAST(IFNULL(p.value_millions, 0) AS REAL) > 0 THEN 1 ELSE 0 END) AS top100
     ${fromClause}
     ${whereClause}`,
    params,
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({
          pending: row?.pending || 0,
          partial: row?.partial || 0,
          validated: row?.validated || 0,
          later: row?.later || 0,
          top100: row?.top100 || 0
        });
      }
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

// ===== DATA EXPLORER =====
app.get('/api/data-explorer-debug', (req, res) => {
  db.all(`SELECT id, name, country FROM enterprises LIMIT 3`, (err, rows) => {
    if (err) return res.json({ error: err.message, source: 'enterprises' });
    res.json({ source: 'enterprises', rows });
  });
});

app.get('/api/data-explorer', (req, res) => {
  const results = [];

  // Fetch enterprises
  db.all(`
    SELECT id, name, country, capitalization, funds_raised, revenue_millions, 'enterprise' as type
    FROM enterprises
    ORDER BY 
      CASE 
        WHEN capitalization IS NOT NULL THEN capitalization
        WHEN funds_raised IS NOT NULL THEN funds_raised
        WHEN revenue_millions IS NOT NULL THEN revenue_millions
        ELSE 0
      END DESC
  `, (err, enterprises) => {
    if (err) return res.status(500).json({ error: err.message });

    // Fetch investors
    db.all(`
      SELECT id, name, country, capitalization, capital_investi, revenue_millions, 'investor' as type
      FROM investors
      ORDER BY 
        CASE 
          WHEN capitalization IS NOT NULL THEN capitalization
          WHEN capital_investi IS NOT NULL THEN capital_investi
          WHEN revenue_millions IS NOT NULL THEN revenue_millions
          ELSE 0
        END DESC
    `, (err2, investors) => {
      if (err2) return res.status(500).json({ error: err2.message });

      // Merge, filter (must have cap/funds/revenue), and sort
      const all = [
        ...enterprises.map(e => ({
          id: e.id, name: e.name, type: e.type, country: e.country,
          value: e.capitalization || e.funds_raised || e.revenue_millions
        })),
        ...investors.map(i => ({
          id: i.id, name: i.name, type: i.type, country: i.country,
          value: i.capitalization || i.capital_investi || i.revenue_millions
        }))
      ].filter(x => x.value !== null && x.value !== undefined);

      all.sort((a, b) => (b.value || 0) - (a.value || 0));
      res.json(all);
    });
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
