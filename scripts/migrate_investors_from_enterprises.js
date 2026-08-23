/**
 * Moves investor records out of `enterprises` and into `investors`.
 *
 * The two tables are separated by activity: an entity whose main activity is to
 * deploy capital belongs to `investors` (conventions.md §1.2).
 *
 * Nothing is lost: before the enterprise row is removed, the companies that cite
 * the investor — through `main_investors` or through an `Investor` partnership —
 * are merged into `investors.participations`, and the now-redundant partnership
 * rows are deleted.
 *
 * Usage:
 *   node scripts/migrate_investors_from_enterprises.js [--ids 1708,1710] [--apply]
 */

const { openDb, APPLY, withTransaction } = require('./lib/db');
const { normalizeKey, splitList, joinList } = require('./lib/text');
const { header, writeAudit, main } = require('./lib/report');

const idsIndex = process.argv.indexOf('--ids');
const EXTRA_IDS = idsIndex > -1
  ? String(process.argv[idsIndex + 1] || '').split(',').map((v) => Number(v.trim())).filter(Number.isInteger)
  : [];

/**
 * Curated `investor_type` per conventions.md §2.2. Only documented cases appear
 * here; anything absent stays NULL rather than being guessed.
 */
const INVESTOR_TYPES = {
  'Altaba': { type: 'Holding / Conglomérat' },
  'Coatue Management': { type: 'Hedge Fund' },
  'EQT Ventures': { type: 'Venture Capital', ownership: 'EQT' },
  'Fika Ventures': { type: 'Venture Capital' },
  'Founders Fund': { type: 'Venture Capital' },
  'Inovia Capital': { type: 'Venture Capital' },
  'Notable Angels': { type: "Club d'investissement" },
  'Obvious Ventures': { type: 'Venture Capital' },
  'Romain Moulin': { type: 'Investisseur individuel' },
  'S4S Ventures': { type: 'Venture Capital' },
  'SIG Venture Capital': { type: 'Corporate VC', ownership: 'Susquehanna International Group' },
  'Sandwater': { type: 'Venture Capital' },
  'Skagerak Capital': { type: 'Venture Capital' },
};

/** Columns carried over as-is from `enterprises` to `investors`. */
const CARRIED = [
  'country', 'headquarter_city', 'founded_year', 'description', 'website', 'logo_url',
  'capitalization', 'revenue_millions', 'employees_count', 'main_competitors',
  'key_resources', 'strategic_partnerships', 'end_year', 'end_reason', 'company_status', 'sector',
];

const isEmpty = (value) => value === null || value === undefined || String(value).trim() === '';

main(async () => {
  const db = openDb();

  const extraClause = EXTRA_IDS.length ? ` OR id IN (${EXTRA_IDS.map(() => '?').join(',')})` : '';
  const candidates = await db.all(
    `SELECT * FROM enterprises WHERE LOWER(TRIM(IFNULL(organization_type, ''))) = 'investor'${extraClause} ORDER BY name`,
    EXTRA_IDS
  );

  if (!candidates.length) {
    console.log('Aucun investisseur a migrer dans la table enterprises.');
    await db.close();
    return;
  }

  const existing = new Map(
    (await db.all('SELECT * FROM investors')).map((row) => [normalizeKey(row.name), row])
  );

  // Companies citing each candidate, from main_investors and from Investor partnerships.
  const citations = new Map(candidates.map((c) => [c.id, new Set()]));
  const allEnterprises = await db.all('SELECT id, name, main_investors FROM enterprises');
  for (const candidate of candidates) {
    const key = normalizeKey(candidate.name);
    for (const row of allEnterprises) {
      if (row.id === candidate.id) continue;
      if (splitList(row.main_investors).some((investor) => normalizeKey(investor) === key)) {
        citations.get(candidate.id).add(row.name);
      }
    }
  }

  const ids = candidates.map((c) => c.id);
  const placeholders = ids.map(() => '?').join(',');
  const relations = await db.all(
    `SELECT p.id, p.enterprise1_id, p.enterprise2_id, a.name n1, b.name n2
     FROM partnerships p
     LEFT JOIN enterprises a ON a.id = p.enterprise1_id
     LEFT JOIN enterprises b ON b.id = p.enterprise2_id
     WHERE p.enterprise1_id IN (${placeholders}) OR p.enterprise2_id IN (${placeholders})`,
    [...ids, ...ids]
  );
  for (const relation of relations) {
    if (citations.has(relation.enterprise2_id) && relation.n1) citations.get(relation.enterprise2_id).add(relation.n1);
    if (citations.has(relation.enterprise1_id) && relation.n2) citations.get(relation.enterprise1_id).add(relation.n2);
  }

  const decisions = [];
  for (const candidate of candidates) {
    const match = existing.get(normalizeKey(candidate.name));
    const curated = INVESTOR_TYPES[candidate.name] || {};
    const participations = joinList([
      ...splitList(match ? match.participations : null),
      ...citations.get(candidate.id),
    ]);

    const fields = {};
    for (const column of CARRIED) {
      if (!isEmpty(candidate[column]) && (!match || isEmpty(match[column]))) fields[column] = candidate[column];
    }
    if (curated.type && (!match || isEmpty(match.investor_type))) fields.investor_type = curated.type;
    if (curated.ownership && (!match || isEmpty(match.ownership))) fields.ownership = curated.ownership;
    if (participations && participations !== (match ? match.participations : null)) fields.participations = participations;

    decisions.push({
      enterprise_id: candidate.id,
      name: candidate.name,
      action: match ? 'merge' : 'insert',
      investor_id: match ? match.id : null,
      investor_type: curated.type || null,
      participations,
      fields: Object.keys(fields),
      _fields: fields,
      _candidate: candidate,
    });
  }

  const merges = decisions.filter((d) => d.action === 'merge');
  const inserts = decisions.filter((d) => d.action === 'insert');
  const untyped = decisions.filter((d) => !d.investor_type);

  header('Migration enterprises -> investors', {
    candidats: decisions.length,
    'a inserer': inserts.length,
    'a fusionner': merges.length,
    'relations a supprimer': relations.length,
  });

  for (const decision of decisions) {
    console.log(`\n  [${decision.action}] #${decision.enterprise_id} ${decision.name}`);
    console.log(`      investor_type : ${decision.investor_type || 'NON DETERMINE (reste NULL)'}`);
    console.log(`      participations: ${decision.participations || '(aucune)'}`);
    console.log(`      champs repris : ${decision.fields.join(', ') || '(aucun)'}`);
  }

  if (untyped.length) {
    console.log(`\nSans investor_type, a qualifier manuellement : ${untyped.map((d) => d.name).join(', ')}`);
  }

  if (APPLY) {
    await withTransaction(db, async () => {
      for (const decision of decisions) {
        const fields = decision._fields;
        if (decision.action === 'insert') {
          const columns = ['name', ...Object.keys(fields), 'is_validated'];
          const values = [decision.name, ...Object.values(fields), decision._candidate.is_validated ?? 3];
          await db.run(
            `INSERT INTO investors (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
            values
          );
        } else if (Object.keys(fields).length) {
          const keys = Object.keys(fields);
          await db.run(
            `UPDATE investors SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [...keys.map((k) => fields[k]), decision.investor_id]
          );
        }
      }

      for (const relation of relations) {
        await db.run('DELETE FROM partnerships WHERE id = ?', [relation.id]);
      }
      for (const id of ids) {
        await db.run('DELETE FROM enterprises WHERE id = ?', [id]);
      }
    });

    console.log(`\n${inserts.length} inseres, ${merges.length} fusionnes, ${relations.length} relations supprimees, ${ids.length} fiches retirees de enterprises.`);
  } else {
    console.log('\n(Mode apercu — relancer avec --apply pour ecrire.)');
  }

  writeAudit('investor_migration_audit.json', {
    candidates: decisions.map(({ _fields, _candidate, ...rest }) => rest),
    deleted_partnerships: relations.map((r) => ({ id: r.id, from: r.n1, to: r.n2 })),
  });

  await db.close();
});
