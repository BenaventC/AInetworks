const fs = require('fs');
const path = require('path');
const { openDb, withTransaction, APPLY } = require('./lib/db');

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

  const chinaFile = path.join(__dirname, '..', 'complementsMIA', 'AF_Daphine_new_companies_china.csv');
  const commFile = path.join(__dirname, '..', 'complementsMIA', 'AFentreprises_communication.csv');
  const blagomiraFile = path.join(__dirname, '..', 'complementsMIA', 'Blagomira_Petkova_groupe_avec_Thomas_Lin.csv');

  const chinaRows = parseCSV(chinaFile);
  const commRows = parseCSV(commFile);
  const blagomiraRows = parseCSV(blagomiraFile);

  console.log(`Loaded ${chinaRows.length} records from AF_Daphine_new_companies_china.csv`);
  console.log(`Loaded ${commRows.length} records from AFentreprises_communication.csv`);
  console.log(`Loaded ${blagomiraRows.length} records from Blagomira_Petkova_groupe_avec_Thomas_Lin.csv`);

  const allRecords = [
    ...chinaRows.map(r => ({ ...r, _source: 'AF_Daphine_new_companies_china.csv' })),
    ...commRows.map(r => ({ ...r, _source: 'AFentreprises_communication.csv' })),
    ...blagomiraRows.map(r => ({ ...r, _source: 'Blagomira_Petkova_groupe_avec_Thomas_Lin.csv' }))
  ];

  // Snapshot existing enterprises
  const existingEnterprises = await db.all('SELECT id, LOWER(TRIM(name)) as norm_name, name FROM enterprises');
  const existingMap = new Map(existingEnterprises.map(e => [e.norm_name, e]));

  const summary = {
    created: 0,
    updated: 0,
    skipped: 0,
    details: []
  };

  const fieldsToInsert = [
    'name', 'sector', 'organization_type', 'country', 'headquarter_city',
    'founded_year', 'description', 'website', 'logo_url', 'capitalization',
    'funds_raised', 'revenue_millions', 'profit_millions', 'rd_expenses_millions',
    'capex_millions', 'employees_count', 'community_size', 'community_unit',
    'main_investors', 'main_competitors', 'participation', 'main_acquisitions',
    'key_resources', 'strategic_partnerships', 'is_validated', 'company_status',
    'end_year', 'end_reason', 'sector_domains'
  ];

  await withTransaction(db, async () => {
    for (const record of allRecords) {
      const companyName = cleanText(record.name);
      if (!companyName) continue;

      const normName = companyName.toLowerCase();
      const existing = existingMap.get(normName);

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
        company_status: cleanText(record.company_status) || 'Active',
        end_year: parseIntVal(record.end_year),
        end_reason: cleanText(record.end_reason),
        sector_domains: cleanText(record.sector_domains)
      };

      if (!existing) {
        summary.created++;
        summary.details.push(`[CREATE] ${companyName} (${parsedData.country || 'N/A'}) - ${record._source}`);
        if (APPLY) {
          const keys = Object.keys(parsedData);
          const placeholders = keys.map(() => '?').join(', ');
          const sql = `INSERT INTO enterprises (${keys.join(', ')}, created_at, updated_at) VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
          const params = keys.map(k => parsedData[k]);
          await db.run(sql, params);
        }
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
          summary.details.push(`[UPDATE] ${companyName} (ID ${existing.id}) - Fields: ${Object.keys(updateFields).join(', ')}`);
          if (APPLY) {
            const setClause = Object.keys(updateFields).map(k => `${k} = ?`).join(', ');
            const sql = `UPDATE enterprises SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            const params = [...Object.values(updateFields), existing.id];
            await db.run(sql, params);
          }
        } else {
          summary.skipped++;
          summary.details.push(`[SKIP] ${companyName} (ID ${existing.id}) - Already complete`);
        }
      }
    }
  });

  console.log('\n=== IMPORT SUMMARY ===');
  console.log(`Mode: ${APPLY ? 'APPLY (Database updated)' : 'PREVIEW (No changes made, pass --apply to execute)'}`);
  console.log(`Created: ${summary.created}`);
  console.log(`Updated: ${summary.updated}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log('\nDetails:');
  summary.details.forEach(d => console.log('  ' + d));

  await db.close();
}

runImport().catch(console.error);
