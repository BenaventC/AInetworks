const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const APPLY = process.argv.includes('--apply');
const argPath = process.argv.find((arg) => arg.startsWith('--dump='));

const DEFAULT_DUMP_PATH = 'c:/Users/33623/AppData/Roaming/Code/User/workspaceStorage/2ee4c5cbd845f4c097f9f7acc7f56484/GitHub.copilot-chat/chat-session-resources/d990daf4-0159-46c7-b941-a23d7e945e4c/call_PUEF9HDAzIXNJK9mUyG6m6Fg__vscode-1785383571469/content.txt';
const DUMP_PATH = argPath ? argPath.slice('--dump='.length) : DEFAULT_DUMP_PATH;

const DB_PATH = path.join(__dirname, '..', 'database.db');
const SOURCE_URL = 'https://sifted.eu/rankings/ai-100-2025';

function canonicalName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function extractJson(raw) {
  const regex = /Result:\s*(\[[\s\S]*\])\s*Page Title:/;
  const match = raw.match(regex);
  if (!match) {
    throw new Error('Unable to extract JSON array from dump file.');
  }
  return match[1];
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function done(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function formatFundsRaised(totalFunding) {
  const n = Number(totalFunding);
  if (!Number.isFinite(n) || n <= 0) return null;
  const m = n / 1_000_000;
  return `${m.toFixed(1)} million EUR`;
}

async function main() {
  const raw = fs.readFileSync(DUMP_PATH, 'utf8');
  const jsonText = extractJson(raw);
  const items = JSON.parse(jsonText);

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('No startup rows found in parsed dump JSON.');
  }

  const db = new sqlite3.Database(DB_PATH);

  try {
    const existing = await all(db, 'SELECT id, name FROM enterprises');
    const existingMap = new Map();
    for (const row of existing) {
      existingMap.set(canonicalName(row.name), row);
    }

    let sourceCount = 0;
    let alreadyInDb = 0;
    let missingInDb = 0;
    let created = 0;

    const sampleExisting = [];
    const sampleCreated = [];

    for (const item of items) {
      const name = String(item.company || '').trim();
      if (!name) continue;

      sourceCount += 1;
      const key = canonicalName(name);

      if (existingMap.has(key)) {
        alreadyInDb += 1;
        if (sampleExisting.length < 20) sampleExisting.push(name);
        continue;
      }

      missingInDb += 1;
      if (!APPLY) continue;

      const stage = item.stage ? String(item.stage) : 'N/A';
      const totalFunding = formatFundsRaised(item.totalFunding);
      const lastRound = formatFundsRaised(item.lastRoundSize);

      const description = `Sifted AI 100 2025 ranking (#${item.rank}). Stage: ${stage}. Last round: ${lastRound || 'N/A'}. Total funding: ${totalFunding || 'N/A'}. Source: ${SOURCE_URL}`;

      await run(
        db,
        `INSERT INTO enterprises (
          name,
          sector,
          organization_type,
          country,
          headquarter_city,
          founded_year,
          description,
          website,
          funds_raised,
          is_validated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          'Artificial Intelligence',
          'Private company',
          item.country || null,
          item.city || null,
          Number.isFinite(Number(item.founded)) ? Number(item.founded) : null,
          description,
          item.website || null,
          totalFunding,
          3
        ]
      );

      created += 1;
      existingMap.set(key, { id: -1, name });
      if (sampleCreated.length < 20) sampleCreated.push(name);
    }

    console.log(`SOURCE_COMPANIES=${sourceCount}`);
    console.log(`ALREADY_IN_DB=${alreadyInDb}`);
    console.log(`MISSING_IN_DB=${missingInDb}`);
    console.log(`APPLY_MODE=${APPLY ? 'YES' : 'NO'}`);
    console.log(`CREATED=${created}`);
    console.log(`SAMPLE_EXISTING=${JSON.stringify(sampleExisting)}`);
    console.log(`SAMPLE_CREATED=${JSON.stringify(sampleCreated)}`);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(`IMPORT_ERROR: ${error.message}`);
  process.exit(1);
});
