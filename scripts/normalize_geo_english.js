const sqlite3 = require('sqlite3').verbose();

const APPLY = process.argv.includes('--apply');
const DB_PATH = 'database.db';

const EMPTY_TOKENS = new Set(['', 'na', 'n/a', 'none', 'null', 'unknown', 'nc']);

const COUNTRY_MAP = new Map([
  ['etats-unis', 'United States'],
  ['états-unis', 'United States'],
  ['usa', 'United States'],
  ['u.s.a.', 'United States'],
  ['united states of america', 'United States'],
  ['royaume-uni', 'United Kingdom'],
  ['uk', 'United Kingdom'],
  ['u.k.', 'United Kingdom'],
  ['pays-bas', 'Netherlands'],
  ['suede', 'Sweden'],
  ['suède', 'Sweden'],
  ['coree du sud', 'South Korea'],
  ['corée du sud', 'South Korea'],
  ['emirats arabes unis', 'United Arab Emirates'],
  ['émirats arabes unis', 'United Arab Emirates'],
  ['arabie saoudite', 'Saudi Arabia'],
  ['suisse', 'Switzerland'],
  ['norvege', 'Norway'],
  ['norvège', 'Norway'],
  ['inde', 'India'],
  ['israel', 'Israel'],
  ['israël', 'Israel'],
  ['japon', 'Japan'],
  ['chine', 'China'],
  ['taïwan', 'Taiwan'],
  ['taiwan', 'Taiwan'],
  ['singapour', 'Singapore'],
  ['australie', 'Australia'],
  ['bresil', 'Brazil'],
  ['brésil', 'Brazil'],
  ['allemagne', 'Germany'],
  ['france', 'France'],
  ['canada', 'Canada'],
  ['portugal', 'Portugal'],
  ['ukraine', 'Ukraine'],
  ['hong kong', 'Hong Kong'],
  ['italie', 'Italy'],
  ['autriche', 'Austria'],
  ['belgique', 'Belgium'],
  ['finlande', 'Finland'],
  ['indonesie', 'Indonesia'],
  ['indonésie', 'Indonesia'],
  ['pakistan', 'Pakistan'],
  ['turquie', 'Turkey']
]);

const CITY_MAP = new Map([
  ['hambourg', 'Hamburg'],
  ['fribourg-en-brisgau', 'Freiburg im Breisgau'],
  ['chemninz', 'Chemnitz'],
  ['zurich', 'Zurich'],
  ['zuerich', 'Zurich'],
  ['tubingen', 'Tuebingen'],
  ['tübingen', 'Tuebingen']
]);

function stripDiacritics(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeKey(value) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSpaces(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function shouldRetitle(value) {
  return value === value.toLowerCase() || value === value.toUpperCase();
}

function titleCaseWords(value) {
  const lowerWords = new Set(['im', 'am', 'an', 'and', 'of', 'the', 'de', 'du', 'la', 'le']);
  return value
    .split(' ')
    .map((word, wordIndex) => {
      if (!word) return word;
      if (word.includes('-')) {
        return word
          .split('-')
          .map((part, partIndex) => {
            if (!part) return part;
            const lowered = part.toLowerCase();
            if ((wordIndex > 0 || partIndex > 0) && lowerWords.has(lowered)) {
              return lowered;
            }
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join('-');
      }

      if (word.includes("'")) {
        return word
          .split("'")
          .map((part, idx) => {
            if (!part) return part;
            const lowered = part.toLowerCase();
            if (idx > 0 && lowered === 's') {
              return 's';
            }
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join("'");
      }

      const lowered = word.toLowerCase();
      if (wordIndex > 0 && lowerWords.has(lowered)) {
        return lowered;
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function normalizeCountry(raw) {
  const text = normalizeSpaces(raw || '');
  if (!text) return null;

  const key = normalizeKey(text);
  if (EMPTY_TOKENS.has(key)) return null;

  if (COUNTRY_MAP.has(key)) return COUNTRY_MAP.get(key);

  // Keep unknown-but-valid values while standardizing visible spacing/case.
  return shouldRetitle(text) ? titleCaseWords(text) : text;
}

function normalizeCity(raw) {
  const text = normalizeSpaces(raw || '');
  if (!text) return null;

  const key = normalizeKey(text);
  if (EMPTY_TOKENS.has(key)) return null;

  if (CITY_MAP.has(key)) return CITY_MAP.get(key);

  return shouldRetitle(text) ? titleCaseWords(text) : text;
}

function run() {
  const db = new sqlite3.Database(DB_PATH);
  db.all('SELECT id, name, country, headquarter_city FROM enterprises ORDER BY id', (err, rows) => {
    if (err) {
      console.error('Error reading enterprises:', err.message);
      db.close();
      process.exit(1);
      return;
    }

    const updates = [];
    let countryChanges = 0;
    let cityChanges = 0;

    for (const row of rows) {
      const nextCountry = normalizeCountry(row.country);
      const nextCity = normalizeCity(row.headquarter_city);

      const currentCountry = row.country && row.country.trim() ? row.country.trim() : null;
      const currentCity = row.headquarter_city && row.headquarter_city.trim() ? row.headquarter_city.trim() : null;

      const countryChanged = nextCountry !== currentCountry;
      const cityChanged = nextCity !== currentCity;

      if (countryChanged || cityChanged) {
        updates.push({
          id: row.id,
          name: row.name,
          fromCountry: currentCountry,
          toCountry: nextCountry,
          fromCity: currentCity,
          toCity: nextCity
        });
      }

      if (countryChanged) countryChanges += 1;
      if (cityChanged) cityChanges += 1;
    }

    console.log(`Total enterprises: ${rows.length}`);
    console.log(`Rows to update: ${updates.length}`);
    console.log(`Country changes: ${countryChanges}`);
    console.log(`City changes: ${cityChanges}`);
    console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);

    if (!APPLY) {
      console.log('Sample changes (first 40):');
      updates.slice(0, 40).forEach((u) => {
        console.log(`#${u.id} ${u.name}`);
        if (u.fromCountry !== u.toCountry) {
          console.log(`  country: ${u.fromCountry || '<empty>'} -> ${u.toCountry || '<empty>'}`);
        }
        if (u.fromCity !== u.toCity) {
          console.log(`  city   : ${u.fromCity || '<empty>'} -> ${u.toCity || '<empty>'}`);
        }
      });
      db.close();
      return;
    }

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      const stmt = db.prepare('UPDATE enterprises SET country = ?, headquarter_city = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      for (const u of updates) {
        stmt.run(u.toCountry, u.toCity, u.id);
      }
      stmt.finalize();

      db.run('COMMIT', (commitErr) => {
        if (commitErr) {
          console.error('Commit failed:', commitErr.message);
          db.run('ROLLBACK');
          db.close();
          process.exit(1);
          return;
        }

        console.log(`Applied updates: ${updates.length}`);
        db.close();
      });
    });
  });
}

run();