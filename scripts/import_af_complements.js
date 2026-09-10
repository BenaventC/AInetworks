const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ROOT, openDb, withTransaction, APPLY } = require('./lib/db');
const { normalizeKey } = require('./lib/text');
const { writeAudit, main } = require('./lib/report');

function getSourcePaths() {
  const sources = [];
  for (let index = 2; index < process.argv.length; index++) {
    if (process.argv[index] !== '--source') continue;
    const source = process.argv[index + 1];
    if (!source || source.startsWith('--')) throw new Error('Each --source option requires a CSV path.');
    sources.push(path.resolve(ROOT, source));
    index++;
  }
  if (!sources.length) {
    throw new Error('No CSV source provided. Usage: node scripts/import_af_complements.js --source <file.csv> [--source <file.csv>] [--apply]');
  }
  return sources;
}

function loadSources(sourcePaths) {
  const hashes = new Map();
  const loaded = [];
  const duplicateSources = [];
  for (const sourcePath of sourcePaths) {
    if (!fs.existsSync(sourcePath)) throw new Error(`CSV source not found: ${sourcePath}`);
    const content = fs.readFileSync(sourcePath);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    if (hashes.has(hash)) {
      duplicateSources.push({ source: path.relative(ROOT, sourcePath), duplicate_of: hashes.get(hash) });
      continue;
    }
    const source = path.relative(ROOT, sourcePath);
    hashes.set(hash, source);
    const rows = parseCSV(sourcePath);
    loaded.push({ source, rows });
    console.log(`Loaded ${rows.length} records from ${source}`);
  }
  return { loaded, duplicateSources };
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const rows = [];
  let curVal = '';
  let curRow = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '"') {
      if (inQuotes && content[i + 1] === '"') {
        curVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      curRow.push(curVal.trim());
      curVal = '';
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (c === '\r' && content[i + 1] === '\n') {
        i++;
      }
      curRow.push(curVal.trim());
      curVal = '';
      if (curRow.some(cell => cell.length > 0)) {
        rows.push(curRow);
      }
      curRow = [];
    } else {
      curVal += c;
    }
  }
  if (curVal.length > 0 || curRow.length > 0) {
    curRow.push(curVal.trim());
    if (curRow.some(cell => cell.length > 0)) {
      rows.push(curRow);
    }
  }

  if (rows.length === 0) return [];
  const header = rows[0].map(h => h.replace(/^"|"$/g, '').trim());
  const data = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const obj = {};
    header.forEach((h, idx) => {
      let val = row[idx] || '';
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/""/g, '"');
      }
      obj[h] = val;
    });
    data.push(obj);
  }
  return data;
}

function parseNumber(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const s = String(val).trim();
  if (!s || s.toUpperCase() === 'NA' || s.toUpperCase() === 'N/A' || s.toUpperCase() === 'NULL') return null;
  const num = parseFloat(s.replace(/,/g, '.'));
  return isNaN(num) ? null : num;
}

function parseIntVal(val) {
  const num = parseNumber(val);
  return num !== null ? Math.round(num) : null;
}

function parseIsValidated(val) {
  if (val === null || val === undefined || val === '') return 3;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  if (s === '2' || s.toLowerCase() === 'validated') return 2;
  if (s === '1' || s.toLowerCase() === 'partially validated') return 1;
  if (s === '0' || s.toLowerCase() === 'unvalidated') return 0;
  if (s === '3') return 3;
  const parsed = parseInt(s, 10);
  return isNaN(parsed) ? 3 : parsed;
}

function normalizeCountry(country) {
  if (!country) return null;
  let c = country.trim();
  if (c.includes(',')) {
    c = c.split(',')[0].trim();
  }
  if (c.toLowerCase() === 'états-unis' || c.toLowerCase() === 'etats-unis') return 'United States';
  if (c.toLowerCase() === 'chine') return 'China';
  if (c.toLowerCase() === 'royaume-uni') return 'United Kingdom';
  return c;
}

function normalizeCity(city) {
  if (!city) return null;
  let ct = city.trim();
  if (ct.toLowerCase() === 'londres') return 'London';
  if (ct.includes(',')) {
    ct = ct.split(',')[0].trim();
  }
  ct = ct.replace(/\s*\([^)]*\)/g, '').trim();
  return ct;
}

function cleanText(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (!s || s.toUpperCase() === 'NA' || s.toUpperCase() === 'N/A' || s.toUpperCase() === 'NULL') return null;
  return s;
}

async function runImport() {
  const db = openDb();
  const { loaded, duplicateSources } = loadSources(getSourcePaths());
  const allRecords = loaded.flatMap(({ source, rows }) => rows.map((record) => ({ ...record, _source: source })));

  // Snapshot existing enterprises
  const existingEnterprises = await db.all('SELECT id, name FROM enterprises');
  const existingMap = new Map();
  for (const enterprise of existingEnterprises) {
    const key = normalizeKey(enterprise.name);
    if (!existingMap.has(key)) existingMap.set(key, []);
    existingMap.get(key).push(enterprise);
  }

  const summary = {
    created: 0,
    updated: 0,
    skipped: 0,
    ambiguous: 0,
    details: []
  };

  await withTransaction(db, async () => {
    for (const record of allRecords) {
      const companyName = cleanText(record.name);
      if (!companyName) continue;

      const normName = normalizeKey(companyName);
      const matches = existingMap.get(normName) || [];
      const existing = matches[0];

      if (matches.length > 1) {
        summary.ambiguous++;
        summary.details.push({
          action: 'ambiguous',
          name: companyName,
          source: record._source,
          candidates: matches.map(({ id, name }) => ({ id, name })),
        });
        continue;
      }

      const parsedData = {
        name: companyName,
        sector: cleanText(record.sector),
        organization_type: cleanText(record.organization_type),
        country: normalizeCountry(cleanText(record.country)),
        headquarter_city: normalizeCity(cleanText(record.headquarter_city)),
        founded_year: parseIntVal(record.founded_year),
        description: cleanText(record.description),
        website: cleanText(record.website),
        logo_url: cleanText(record.logo_url),
        capitalization: parseNumber(record.capitalization),
        funds_raised: parseNumber(record.funds_raised),
        revenue_millions: parseNumber(record.revenue_millions),
        profit_millions: parseNumber(record.profit_millions),
        rd_expenses_millions: parseNumber(record.rd_expenses_millions),
        capex_millions: parseNumber(record.capex_millions),
        employees_count: parseIntVal(record.employees_count),
        community_size: parseIntVal(record.community_size),
        community_unit: cleanText(record.community_unit),
        main_investors: cleanText(record.main_investors),
        main_competitors: cleanText(record.main_competitors),
        participation: cleanText(record.participation),
        main_acquisitions: cleanText(record.main_acquisitions),
        key_resources: cleanText(record.key_resources),
        strategic_partnerships: cleanText(record.strategic_partnerships),
        is_validated: parseIsValidated(record.is_validated),
        company_status: cleanText(record.company_status),
        end_year: parseIntVal(record.end_year),
        end_reason: cleanText(record.end_reason),
        sector_domains: cleanText(record.sector_domains)
      };

      if (!existing) {
        summary.created++;
        const decision = { action: 'created', name: companyName, source: record._source, fields: Object.keys(parsedData).filter((key) => parsedData[key] !== null) };
        summary.details.push(decision);
        if (APPLY) {
          const keys = Object.keys(parsedData);
          const placeholders = keys.map(() => '?').join(', ');
          const sql = `INSERT INTO enterprises (${keys.join(', ')}, created_at, updated_at) VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
          const params = keys.map(k => parsedData[k]);
          const result = await db.run(sql, params);
          existingMap.set(normName, [{ id: result.lastID, name: companyName }]);
        } else {
          existingMap.set(normName, [{ id: null, name: companyName, pending: true }]);
        }
      } else if (existing.pending) {
        summary.skipped++;
        summary.details.push({ action: 'skipped', name: companyName, source: record._source, reason: 'duplicate normalized name in input' });
      } else {
        // Check for non-destructive update (fill missing fields only)
        const dbRow = await db.get('SELECT * FROM enterprises WHERE id = ?', [existing.id]);
        const updateFields = {};
        for (const k of Object.keys(parsedData)) {
          if (parsedData[k] !== null && parsedData[k] !== undefined && (dbRow[k] === null || dbRow[k] === undefined || dbRow[k] === '')) {
            updateFields[k] = parsedData[k];
          }
        }
        if (Object.keys(updateFields).length > 0) {
          summary.updated++;
          summary.details.push({ action: 'updated', id: existing.id, name: companyName, source: record._source, fields: Object.keys(updateFields) });
          if (APPLY) {
            const setClause = Object.keys(updateFields).map(k => `${k} = ?`).join(', ');
            const sql = `UPDATE enterprises SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            const params = [...Object.values(updateFields), existing.id];
            await db.run(sql, params);
          }
        } else {
          summary.skipped++;
          summary.details.push({ action: 'skipped', id: existing.id, name: companyName, source: record._source, reason: 'already complete' });
        }
      }
    }
  });

  console.log('\n=== IMPORT SUMMARY ===');
  console.log(`Mode: ${APPLY ? 'APPLY (Database updated)' : 'PREVIEW (No changes made, pass --apply to execute)'}`);
  console.log(`Created: ${summary.created}`);
  console.log(`Updated: ${summary.updated}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Ambiguous: ${summary.ambiguous}`);
  console.log('\nDetails:');
  summary.details.forEach((decision) => console.log(`  [${decision.action.toUpperCase()}] ${decision.name} - ${decision.source}`));

  writeAudit('af_complements_import_audit.json', {
    sources: loaded.map(({ source, rows }) => ({ source, rows: rows.length })),
    duplicate_sources: duplicateSources,
    counts: { created: summary.created, updated: summary.updated, skipped: summary.skipped, ambiguous: summary.ambiguous },
    decisions: summary.details,
  });

  await db.close();
}

main(runImport);
