const API_BASE = 'http://localhost:3000';
const PAGE_LIMIT = 100;

const COUNTRY_MAP = {
  'Etats-Unis': 'United States',
  'États-Unis': 'United States',
  'USA': 'United States',
  'U.S.': 'United States',
  'U.S.A.': 'United States',
  'Royaume-Uni': 'United Kingdom',
  'UK': 'United Kingdom',
  'France': 'France',
  'Allemagne': 'Germany',
  'Espagne': 'Spain',
  'Italie': 'Italy',
  'Pays-Bas': 'Netherlands',
  'Suisse': 'Switzerland',
  'Autriche': 'Austria',
  'Belgique': 'Belgium',
  'Suede': 'Sweden',
  'Suède': 'Sweden',
  'Norvege': 'Norway',
  'Norvège': 'Norway',
  'Danemark': 'Denmark',
  'Finlande': 'Finland',
  'Pologne': 'Poland',
  'Portugal': 'Portugal',
  'Irlande': 'Ireland',
  'Tchequie': 'Czech Republic',
  'Tchéquie': 'Czech Republic',
  'Roumanie': 'Romania',
  'Hongrie': 'Hungary',
  'Ukraine': 'Ukraine',
  'Russie': 'Russia',
  'Turquie': 'Turkey',
  'Inde': 'India',
  'Chine': 'China',
  'Japon': 'Japan',
  'Coree du Sud': 'South Korea',
  'Corée du Sud': 'South Korea',
  'Singapour': 'Singapore',
  'Taiwan': 'Taiwan',
  'Australie': 'Australia',
  'Nouvelle-Zelande': 'New Zealand',
  'Nouvelle-Zélande': 'New Zealand',
  'Canada': 'Canada',
  'Mexique': 'Mexico',
  'Bresil': 'Brazil',
  'Brésil': 'Brazil',
  'Argentine': 'Argentina',
  'Chili': 'Chile',
  'Colombie': 'Colombia',
  'Perou': 'Peru',
  'Pérou': 'Peru',
  'Afrique du Sud': 'South Africa',
  'Nigeria': 'Nigeria',
  'Kenya': 'Kenya',
  'Maroc': 'Morocco',
  'Egypte': 'Egypt',
  'Égypte': 'Egypt',
  'Emirats arabes unis': 'United Arab Emirates',
  'Émirats arabes unis': 'United Arab Emirates',
  'Arabie saoudite': 'Saudi Arabia',
  'Israël': 'Israel',
  'Israel': 'Israel'
};

const FRENCH_HINT_RE = /[\u00C0-\u017F]|\b(plateforme|logiciel|gestion|donnees|données|avec|pour|entreprise|partenariat|partenariats|strategique|stratégique|principaux|principales|autres|leve|leves|levés|fonds|millions?|milliards?)\b/i;
const cache = new Map();

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${url}: ${JSON.stringify(data).slice(0, 300)}`);
  }

  return data;
}

async function fetchAllEnterprises() {
  const all = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${API_BASE}/api/enterprises?segment=all&page=${page}&limit=${PAGE_LIMIT}`;
    const payload = await fetchJson(url);
    const items = payload.items || [];
    all.push(...items);
    totalPages = payload.pagination?.totalPages || 1;
    page += 1;
  }

  return all;
}

function normalizeCountry(country) {
  if (!country || typeof country !== 'string') return country;
  const key = country.trim();
  return COUNTRY_MAP[key] || key;
}

function shouldTranslate(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.length < 2) return false;
  return FRENCH_HINT_RE.test(trimmed);
}

async function translateToEnglish(text) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  if (cache.has(trimmed)) {
    return cache.get(trimmed);
  }

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(trimmed)}`;

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const translated = (data?.[0] || []).map((chunk) => chunk?.[0] || '').join('').trim();
      const result = translated || trimmed;
      cache.set(trimmed, result);
      return result;
    } catch (err) {
      lastError = err;
      await sleep(350 * attempt);
    }
  }

  throw new Error(`Translation failed: ${lastError?.message || 'unknown error'}`);
}

function buildEnterprisePayload(ent) {
  const payload = { ...ent };
  delete payload.id;
  delete payload.created_at;
  delete payload.updated_at;
  return payload;
}

async function updateEnterprise(id, payload) {
  await fetchJson(`${API_BASE}/api/enterprises/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload)
  });
}

async function main() {
  const start = Date.now();
  const enterprises = await fetchAllEnterprises();
  const total = enterprises.length;

  let changedCount = 0;
  let unchangedCount = 0;
  let failureCount = 0;

  console.log(`Loaded ${total} enterprises`);

  for (let i = 0; i < total; i += 1) {
    const ent = enterprises[i];
    const payload = buildEnterprisePayload(ent);
    let changed = false;

    try {
      const mappedCountry = normalizeCountry(payload.country);
      if (mappedCountry !== payload.country) {
        payload.country = mappedCountry;
        changed = true;
      }

      const fields = [
        'sector',
        'description',
        'funds_raised',
        'main_investors',
        'main_competitors',
        'main_acquisitions',
        'strategic_partnerships'
      ];

      for (const field of fields) {
        const value = payload[field];
        if (!shouldTranslate(value)) continue;
        const translated = await translateToEnglish(value);
        if (translated !== value) {
          payload[field] = translated;
          changed = true;
        }
      }

      if (changed) {
        await updateEnterprise(ent.id, payload);
        changedCount += 1;
      } else {
        unchangedCount += 1;
      }

      if ((i + 1) % 25 === 0 || i + 1 === total) {
        const elapsedSec = Math.round((Date.now() - start) / 1000);
        console.log(`Progress ${i + 1}/${total} | changed=${changedCount} unchanged=${unchangedCount} failed=${failureCount} | elapsed=${elapsedSec}s`);
      }

      await sleep(120);
    } catch (err) {
      failureCount += 1;
      console.error(`FAILED id=${ent.id} name=${ent.name}: ${err.message}`);
    }
  }

  const elapsedSec = Math.round((Date.now() - start) / 1000);
  console.log(`Done | total=${total} changed=${changedCount} unchanged=${unchangedCount} failed=${failureCount} elapsed=${elapsedSec}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
