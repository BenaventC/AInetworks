const sqlite3 = require('sqlite3').verbose();
const isDryRun = process.argv.includes('--dry-run');

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('OPEN_ERROR', err.message);
    process.exit(1);
  }
});

const SOURCE_FILTER = "organization_type = 'Investor'";

if (isDryRun) {
  console.log('MODE=DRY_RUN');
}

function rollbackAndExit(errorMessage) {
  db.run('ROLLBACK', () => {
    console.error(errorMessage);
    db.close();
    process.exit(1);
  });
}

function commitAndClose(migratedCount, insertedCount, updatedCount) {
  db.run('COMMIT', (err) => {
    if (err) {
      rollbackAndExit('COMMIT_ERROR ' + err.message);
      return;
    }

    console.log('MIGRATED_TOTAL=' + migratedCount);
    console.log('MIGRATED_INSERTED=' + insertedCount);
    console.log('MIGRATED_UPDATED=' + updatedCount);

    db.get(
      "SELECT SUM(CASE WHEN organization_type = 'Investor' THEN 1 ELSE 0 END) AS remaining FROM enterprises",
      (countErr, row) => {
        if (countErr) {
          console.error('POST_CHECK_ERROR', countErr.message);
        } else {
          console.log('ENTERPRISE_INVESTOR_REMAINING=' + (row?.remaining || 0));
        }
        db.close();
      }
    );
  });
}

db.serialize(() => {
  db.all(`SELECT * FROM enterprises WHERE ${SOURCE_FILTER} ORDER BY id`, (selectErr, rows) => {
    if (selectErr) {
      console.error('SELECT_ERROR', selectErr.message);
      db.close();
      process.exit(1);
    }

    if (!rows.length) {
      console.log('NO_ROWS_TO_MIGRATE');
      db.close();
      return;
    }

    if (isDryRun) {
      const names = rows.map((r) => r.name);
      const placeholders = names.map(() => '?').join(',');
      const existingSql = `SELECT name FROM investors WHERE name IN (${placeholders})`;

      db.all(existingSql, names, (existingErr, existingRows) => {
        if (existingErr) {
          console.error('DRY_RUN_CHECK_ERROR', existingErr.message);
          db.close();
          process.exit(1);
        }

        const existingNames = new Set(existingRows.map((r) => r.name));
        const toUpdate = rows.filter((r) => existingNames.has(r.name));
        const toInsert = rows.filter((r) => !existingNames.has(r.name));

        console.log('DRY_RUN_TOTAL=' + rows.length);
        console.log('DRY_RUN_INSERT=' + toInsert.length);
        console.log('DRY_RUN_UPDATE=' + toUpdate.length);
        console.log('DRY_RUN_DELETE_FROM_ENTERPRISES=' + rows.length);

        if (toInsert.length) {
          console.log('DRY_RUN_INSERT_NAMES=' + toInsert.map((r) => r.name).join('|'));
        }
        if (toUpdate.length) {
          console.log('DRY_RUN_UPDATE_NAMES=' + toUpdate.map((r) => r.name).join('|'));
        }

        db.close();
      });
      return;
    }

    db.run('BEGIN TRANSACTION', (beginErr) => {
      if (beginErr) {
        console.error('BEGIN_ERROR', beginErr.message);
        db.close();
        process.exit(1);
      }

      let inserted = 0;
      let updated = 0;

      const insertSql = `
        INSERT INTO investors (
          name, country, headquarter_city, founded_year, description, website, logo_url,
          capitalization, capital_investi, revenue_millions, employees_count,
          main_competitors, participations, acquisitions, key_resources, strategic_partnerships,
          is_validated, end_year, end_reason, company_status, created_at, updated_at,
          investor_type, ownership
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `;

      const updateSql = `
        UPDATE investors
        SET country = ?,
            headquarter_city = ?,
            founded_year = ?,
            description = ?,
            website = ?,
            logo_url = ?,
            capitalization = ?,
            capital_investi = ?,
            revenue_millions = ?,
            employees_count = ?,
            main_competitors = ?,
            participations = ?,
            acquisitions = ?,
            key_resources = ?,
            strategic_partnerships = ?,
            is_validated = ?,
            end_year = ?,
            end_reason = ?,
            company_status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE name = ?
      `;

      function migrateAt(index) {
        if (index >= rows.length) {
          db.run(`DELETE FROM enterprises WHERE ${SOURCE_FILTER}`, (deleteErr) => {
            if (deleteErr) {
              rollbackAndExit('DELETE_ERROR ' + deleteErr.message);
              return;
            }
            commitAndClose(rows.length, inserted, updated);
          });
          return;
        }

        const row = rows[index];

        db.get('SELECT id FROM investors WHERE name = ?', [row.name], (existsErr, existingInvestor) => {
          if (existsErr) {
            rollbackAndExit('CHECK_EXISTS_ERROR ' + existsErr.message);
            return;
          }

          if (existingInvestor) {
            const updateParams = [
              row.country ?? null,
              row.headquarter_city ?? null,
              row.founded_year ?? null,
              row.description ?? null,
              row.website ?? null,
              row.logo_url ?? null,
              row.capitalization ?? null,
              row.funds_raised ?? null,
              row.revenue_millions ?? null,
              row.employees_count ?? null,
              row.main_competitors ?? null,
              row.participation ?? null,
              row.main_acquisitions ?? null,
              row.key_resources ?? null,
              row.strategic_partnerships ?? null,
              row.is_validated ?? 3,
              row.end_year ?? null,
              row.end_reason ?? null,
              row.company_status ?? null,
              row.name
            ];

            db.run(updateSql, updateParams, function (updateErr) {
              if (updateErr) {
                rollbackAndExit('UPDATE_ERROR ' + updateErr.message);
                return;
              }
              updated += this.changes || 0;
              migrateAt(index + 1);
            });
          } else {
            const insertParams = [
              row.name,
              row.country ?? null,
              row.headquarter_city ?? null,
              row.founded_year ?? null,
              row.description ?? null,
              row.website ?? null,
              row.logo_url ?? null,
              row.capitalization ?? null,
              row.funds_raised ?? null,
              row.revenue_millions ?? null,
              row.employees_count ?? null,
              row.main_competitors ?? null,
              row.participation ?? null,
              row.main_acquisitions ?? null,
              row.key_resources ?? null,
              row.strategic_partnerships ?? null,
              row.is_validated ?? 3,
              row.end_year ?? null,
              row.end_reason ?? null,
              row.company_status ?? null,
              row.created_at ?? null,
              row.updated_at ?? null,
              null,
              null
            ];

            db.run(insertSql, insertParams, function (insertErr) {
              if (insertErr) {
                rollbackAndExit('INSERT_ERROR ' + insertErr.message);
                return;
              }
              inserted += this.changes || 0;
              migrateAt(index + 1);
            });
          }
        });
      }

      migrateAt(0);
    });
  });
});
