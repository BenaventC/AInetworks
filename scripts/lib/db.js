/**
 * Shared SQLite helpers for the scripts in this folder.
 *
 * Solves three recurring problems found across the previous copies:
 * - the database path was resolved from the current working directory, so a script
 *   only worked when launched from the repository root;
 * - db.all / db.run were re-promisified in every file with slightly different shapes;
 * - several writing scripts had no transaction, leaving the base inconsistent on error.
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const ROOT = path.join(__dirname, '..', '..');
const DB_PATH = path.join(ROOT, 'database.db');

/** True when the caller passed --apply. All scripts preview by default. */
const APPLY = process.argv.includes('--apply');

function openDb() {
  const db = new sqlite3.Database(DB_PATH);
  return {
    raw: db,
    all: (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (e, r) => (e ? rej(e) : res(r || [])))),
    get: (sql, params = []) => new Promise((res, rej) => db.get(sql, params, (e, r) => (e ? rej(e) : res(r)))),
    run: (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function onRun(e) { return e ? rej(e) : res(this); })),
    close: () => new Promise((res) => db.close(() => res())),
  };
}

/** Runs `work` inside a transaction, rolling back entirely on any error. */
async function withTransaction(db, work) {
  await db.run('BEGIN TRANSACTION');
  try {
    const result = await work();
    await db.run('COMMIT');
    return result;
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

/** Builds an idempotent UPDATE from a field map, skipping empty change sets. */
function buildUpdate(table, fields, id) {
  const keys = Object.keys(fields);
  if (!keys.length) return null;
  const sql = `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  return { sql, params: [...keys.map((k) => fields[k]), id] };
}

module.exports = { ROOT, DB_PATH, APPLY, openDb, withTransaction, buildUpdate };
