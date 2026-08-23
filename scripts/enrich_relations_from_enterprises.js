const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const APPLY = process.argv.includes('--apply');
const DB_PATH = require('./lib/db').DB_PATH;

const RELATION_SOURCES = [
  { column: 'main_investors', relationType: 'Investor' },
  { column: 'main_competitors', relationType: 'Competitor' },
  { column: 'main_acquisitions', relationType: 'Acquisition' },
  { column: 'strategic_partnerships', relationType: 'Strategic partnership' }
];

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitItems(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeDate(dateText) {
  if (!dateText) return null;
  const value = dateText.trim();

  const fullDate = value.match(/\b(19|20)\d{2}-\d{2}-\d{2}\b/);
  if (fullDate) {
    return fullDate[0];
  }

  const year = value.match(/\b(19|20)\d{2}\b/);
  if (year) {
    return `${year[0]}-01-01`;
  }

  return null;
}

function parseTargetItem(rawItem) {
  const item = rawItem.trim();
  const parenMatch = item.match(/\(([^()]*)\)\s*$/);

  let startDate = null;
  let targetName = item;

  if (parenMatch) {
    startDate = normalizeDate(parenMatch[1]);
    targetName = item.slice(0, parenMatch.index).trim();
  }

  targetName = targetName
    .replace(/\s+/g, ' ')
    .replace(/[;:\-\s]+$/g, '')
    .trim();

  if (!targetName) {
    return null;
  }

  return { targetName, startDate };
}

function mergeTypes(existingValue, relationType) {
  const parts = String(existingValue || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!parts.includes(relationType)) {
    parts.push(relationType);
  }

  return parts.join(', ');
}

function nowStamp() {
  const d = new Date();
  return d.toISOString().replace(/[:.]/g, '-');
}

function backupDatabase() {
  const backupPath = path.resolve(`database.backup.relations-enrichment.${nowStamp()}.db`);
  fs.copyFileSync(DB_PATH, backupPath);
  return backupPath;
}

function run() {
  const db = new sqlite3.Database(DB_PATH);

  const all = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });

  const get = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });

  const runStmt = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function onRun(err) {
        if (err) return reject(err);
        resolve(this);
      });
    });

  (async () => {
    const enterprises = await all(
      `SELECT id, name, main_investors, main_competitors, main_acquisitions, strategic_partnerships
       FROM enterprises
       ORDER BY id`
    );

    const nameToEnterprise = new Map();
    const idToName = new Map();
    for (const ent of enterprises) {
      const key = normalizeKey(ent.name);
      if (key) {
        nameToEnterprise.set(key, { id: ent.id, name: ent.name });
      }
      idToName.set(ent.id, ent.name);
    }

    const existingRelations = await all(
      'SELECT id, enterprise1_id, enterprise2_id, type_relation, partnership_type, start_date FROM partnerships'
    );
    const relationByPair = new Map();
    for (const rel of existingRelations) {
      relationByPair.set(`${rel.enterprise1_id}:${rel.enterprise2_id}`, rel);
    }

    const actions = [];

    for (const ent of enterprises) {
      for (const source of RELATION_SOURCES) {
        const entries = splitItems(ent[source.column]);
        for (const entry of entries) {
          const parsed = parseTargetItem(entry);
          if (!parsed) continue;

          const targetKey = normalizeKey(parsed.targetName);
          if (!targetKey) continue;

          const focalKey = normalizeKey(ent.name);
          if (targetKey === focalKey) continue;

          let target = nameToEnterprise.get(targetKey);
          if (!target) {
            actions.push({
              type: 'create-enterprise',
              targetName: parsed.targetName,
              targetKey
            });
            target = { id: null, name: parsed.targetName, targetKey };
            nameToEnterprise.set(targetKey, target);
          }

          actions.push({
            type: 'upsert-relation',
            focalId: ent.id,
            focalName: ent.name,
            targetKey,
            targetName: parsed.targetName,
            relationType: source.relationType,
            startDate: parsed.startDate
          });
        }
      }
    }

    let createdEnterprises = 0;
    let createdRelations = 0;
    let updatedRelations = 0;
    let skippedRelations = 0;

    if (!APPLY) {
      const plannedCreateEnt = actions.filter((a) => a.type === 'create-enterprise').length;
      const plannedRelations = actions.filter((a) => a.type === 'upsert-relation').length;

      console.log(`Mode: DRY RUN`);
      console.log(`Enterprises scanned: ${enterprises.length}`);
      console.log(`Planned enterprise creations: ${plannedCreateEnt}`);
      console.log(`Planned relation upserts: ${plannedRelations}`);
      console.log('Sample relation actions (first 40):');

      actions
        .filter((a) => a.type === 'upsert-relation')
        .slice(0, 40)
        .forEach((a) => {
          console.log(
            `- ${a.focalName} -> ${a.targetName} | type_relation=${a.relationType}${a.startDate ? ` | start_date=${a.startDate}` : ''}`
          );
        });

      db.close();
      return;
    }

    const backupPath = backupDatabase();

    await runStmt('BEGIN TRANSACTION');

    try {
      for (const action of actions) {
        if (action.type === 'create-enterprise') {
          const existing = nameToEnterprise.get(action.targetKey);
          if (existing && existing.id) continue;

          const insertResult = await runStmt(
            'INSERT INTO enterprises (name, is_validated) VALUES (?, 0)',
            [action.targetName]
          );

          createdEnterprises += 1;
          const created = { id: insertResult.lastID, name: action.targetName };
          nameToEnterprise.set(action.targetKey, created);
          idToName.set(created.id, created.name);
          continue;
        }

        const target = nameToEnterprise.get(action.targetKey);
        if (!target || !target.id) {
          skippedRelations += 1;
          continue;
        }

        const pairKey = `${action.focalId}:${target.id}`;
        const existingRel = relationByPair.get(pairKey);

        if (!existingRel) {
          const insertRel = await runStmt(
            `INSERT INTO partnerships (
               enterprise1_id, enterprise2_id, partnership_type, type_relation,
               description, start_date, end_year, status, sources_information,
               infra_commitment_text, value_millions, is_validated
             ) VALUES (?, ?, ?, ?, NULL, ?, NULL, 'active', NULL, NULL, NULL, 0)`,
            [action.focalId, target.id, action.relationType, action.relationType, action.startDate]
          );

          relationByPair.set(pairKey, {
            id: insertRel.lastID,
            enterprise1_id: action.focalId,
            enterprise2_id: target.id,
            type_relation: action.relationType,
            partnership_type: action.relationType,
            start_date: action.startDate
          });

          createdRelations += 1;
          continue;
        }

        const mergedTypeRelation = mergeTypes(existingRel.type_relation, action.relationType);
        const mergedPartnershipType = mergeTypes(existingRel.partnership_type, action.relationType);
        const nextStartDate = existingRel.start_date || action.startDate || null;

        const needsUpdate =
          mergedTypeRelation !== (existingRel.type_relation || '') ||
          mergedPartnershipType !== (existingRel.partnership_type || '') ||
          nextStartDate !== (existingRel.start_date || null);

        if (!needsUpdate) {
          skippedRelations += 1;
          continue;
        }

        await runStmt(
          `UPDATE partnerships
           SET type_relation = ?, partnership_type = ?, start_date = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [mergedTypeRelation, mergedPartnershipType, nextStartDate, existingRel.id]
        );

        existingRel.type_relation = mergedTypeRelation;
        existingRel.partnership_type = mergedPartnershipType;
        existingRel.start_date = nextStartDate;
        updatedRelations += 1;
      }

      await runStmt('COMMIT');

      console.log('Mode: APPLY');
      console.log(`Backup created: ${backupPath}`);
      console.log(`Enterprises scanned: ${enterprises.length}`);
      console.log(`Created target enterprises: ${createdEnterprises}`);
      console.log(`Created relations: ${createdRelations}`);
      console.log(`Updated relations: ${updatedRelations}`);
      console.log(`Skipped relation actions: ${skippedRelations}`);
    } catch (err) {
      await runStmt('ROLLBACK');
      throw err;
    } finally {
      db.close();
    }
  })().catch((err) => {
    console.error('Enrichment failed:', err.message);
    db.close();
    process.exit(1);
  });
}

run();
