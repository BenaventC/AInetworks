const sqlite3 = require('sqlite3').verbose();

const APPLY = process.argv.includes('--apply');
const DB_PATH = 'database.db';

const EMPTY_TOKENS = new Set(['', 'na', 'n/a', 'none', 'null', 'unknown', 'nc']);

const CONTEXT_BOOST_RE = /\b(headquartered|based|founded|founded in|siege|si[eè]ge|hq|startup|entreprise|company|societe)\b/i;

const COUNTRY_PATTERNS = [
  { country: 'USA', pattern: /\b(united states|u\.?s\.?a?\.?|etats[-\s]?unis|americaine?s?|americain?s?|am[eé]ricaine?s?|am[eé]ricain?s?|american)\b/i },
  { country: 'UK', pattern: /\b(united kingdom|u\.?k\.?|royaume[-\s]?uni|british|britannique?s?)\b/i },
  { country: 'France', pattern: /\b(france|french|fran[cç]aise?s?|fran[cç]ais)\b/i },
  { country: 'Germany', pattern: /\b(germany|german|allemagne|allemande?s?)\b/i },
  { country: 'Netherlands', pattern: /\b(netherlands|dutch|pays[-\s]?bas)\b/i },
  { country: 'Sweden', pattern: /\b(sweden|swedish|su[eè]de|su[eé]doise?s?)\b/i },
  { country: 'South Korea', pattern: /\b(south korea|cor[eé]e du sud|korean)\b/i },
  { country: 'Japan', pattern: /\b(japan|japanese|japon)\b/i },
  { country: 'China', pattern: /\b(china|chinese|chine)\b/i },
  { country: 'Canada', pattern: /\b(canada|canadian)\b/i },
  { country: 'India', pattern: /\b(india|indian|inde)\b/i },
  { country: 'Israel', pattern: /\b(israel|israeli|isra[eë]l)\b/i },
  { country: 'Singapore', pattern: /\b(singapore|singapour)\b/i },
  { country: 'Switzerland', pattern: /\b(switzerland|swiss|suisse)\b/i },
  { country: 'UAE', pattern: /\b(uae|united arab emirates|[eé]mirats arabes unis)\b/i },
  { country: 'Saudi Arabia', pattern: /\b(saudi arabia|arabie saoudite)\b/i },
  { country: 'Spain', pattern: /\b(spain|spanish|espagne)\b/i },
  { country: 'Italy', pattern: /\b(italy|italian|italie)\b/i },
  { country: 'Finland', pattern: /\b(finland|finnish|finlande)\b/i },
  { country: 'Norway', pattern: /\b(norway|norwegian|norv[eè]ge)\b/i },
  { country: 'Austria', pattern: /\b(austria|austrian|autriche)\b/i },
  { country: 'Belgium', pattern: /\b(belgium|belgian|belgique)\b/i },
  { country: 'Portugal', pattern: /\b(portugal|portuguese)\b/i },
  { country: 'Brazil', pattern: /\b(brazil|brazilian|br[eé]sil)\b/i },
  { country: 'Australia', pattern: /\b(australia|australian)\b/i }
];

const CITY_TO_COUNTRY_PATTERNS = [
  { country: 'USA', pattern: /\b(san francisco|menlo park|mountain view|boston|palo alto|seattle|new york|silicon valley)\b/i },
  { country: 'UK', pattern: /\b(london|cambridge|oxford|manchester)\b/i },
  { country: 'France', pattern: /\b(paris|lyon|marseille|lille)\b/i },
  { country: 'Germany', pattern: /\b(berlin|munich|hamburg|frankfurt|stuttgart)\b/i },
  { country: 'Netherlands', pattern: /\b(amsterdam|rotterdam|eindhoven)\b/i },
  { country: 'Sweden', pattern: /\b(stockholm|gothenburg)\b/i },
  { country: 'South Korea', pattern: /\b(seoul|suwon)\b/i },
  { country: 'Japan', pattern: /\b(tokyo|osaka)\b/i },
  { country: 'China', pattern: /\b(beijing|shanghai|shenzhen|hangzhou)\b/i },
  { country: 'Canada', pattern: /\b(toronto|montreal|vancouver)\b/i },
  { country: 'Singapore', pattern: /\b(singapore)\b/i },
  { country: 'Switzerland', pattern: /\b(zurich|geneva|lausanne)\b/i }
];

function isMissingCountry(value) {
  if (value === null || value === undefined) return true;
  const key = String(value).trim().toLowerCase();
  return EMPTY_TOKENS.has(key);
}

function inferCountryFromDescription(description) {
  if (!description || typeof description !== 'string') {
    return null;
  }

  const text = description.trim();
  if (!text) {
    return null;
  }

  const scores = new Map();

  for (const rule of COUNTRY_PATTERNS) {
    const globalPattern = new RegExp(rule.pattern.source, 'gi');
    let match;
    let score = 0;

    while ((match = globalPattern.exec(text)) !== null) {
      score += 1;

      const start = Math.max(0, match.index - 35);
      const context = text.slice(start, match.index + match[0].length);
      if (CONTEXT_BOOST_RE.test(context)) {
        score += 2;
      }
    }

    if (score > 0) {
      scores.set(rule.country, (scores.get(rule.country) || 0) + score);
    }
  }

  if (scores.size > 0) {
    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const [bestCountry, bestScore] = ranked[0];
    const secondScore = ranked[1] ? ranked[1][1] : 0;

    // Reste prudent: accepte si une seule option, ou si l'option gagnante est nettement devant.
    if (ranked.length === 1 && bestScore >= 1) {
      return bestCountry;
    }

    if (bestScore >= 3 && bestScore >= secondScore + 2) {
      return bestCountry;
    }
  }

  // Fallback moins strict: inférence via villes explicites dans la description.
  const cityScores = new Map();
  for (const rule of CITY_TO_COUNTRY_PATTERNS) {
    const globalPattern = new RegExp(rule.pattern.source, 'gi');
    const matches = text.match(globalPattern);
    if (matches && matches.length > 0) {
      cityScores.set(rule.country, (cityScores.get(rule.country) || 0) + matches.length);
    }
  }

  if (cityScores.size > 0) {
    const cityRanked = [...cityScores.entries()].sort((a, b) => b[1] - a[1]);
    const [cityBestCountry, cityBestScore] = cityRanked[0];
    const citySecondScore = cityRanked[1] ? cityRanked[1][1] : 0;

    if (cityRanked.length === 1 && cityBestScore >= 1) {
      return cityBestCountry;
    }

    if (cityBestScore >= 2 && cityBestScore >= citySecondScore + 1) {
      return cityBestCountry;
    }
  }

  return null;
}

function run() {
  const db = new sqlite3.Database(DB_PATH);

  db.all(
    `SELECT id, name, country, description
     FROM enterprises
     WHERE country IS NULL
        OR TRIM(country) = ''
        OR LOWER(TRIM(country)) IN ('na', 'n/a', 'none', 'null', 'unknown', 'nc')
     ORDER BY id`,
    (err, rows) => {
      if (err) {
        console.error('Error reading enterprises:', err.message);
        db.close();
        process.exit(1);
        return;
      }

      const updates = [];
      for (const row of rows) {
        const inferred = inferCountryFromDescription(row.description);
        if (inferred && isMissingCountry(row.country)) {
          updates.push({
            id: row.id,
            name: row.name,
            fromCountry: row.country,
            toCountry: inferred,
            description: (row.description || '').replace(/\s+/g, ' ').slice(0, 180)
          });
        }
      }

      console.log(`Candidates with missing country: ${rows.length}`);
      console.log(`Confident inferences: ${updates.length}`);
      console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);

      if (!APPLY) {
        console.log('Sample inferences (first 40):');
        updates.slice(0, 40).forEach((u) => {
          console.log(`#${u.id} ${u.name}`);
          console.log(`  country: ${u.fromCountry || '<empty>'} -> ${u.toCountry}`);
          if (u.description) {
            console.log(`  desc: ${u.description}`);
          }
        });
        db.close();
        return;
      }

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare('UPDATE enterprises SET country = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        for (const u of updates) {
          stmt.run(u.toCountry, u.id);
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
    }
  );
}

run();
