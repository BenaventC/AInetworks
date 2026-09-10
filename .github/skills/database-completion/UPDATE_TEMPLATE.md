# Update Checklist

Use this checklist for a targeted enterprise or investor update. The database schema and `conventions.md` are authoritative; do not copy a stale payload template into a new script.

- [ ] Confirm the canonical entity and database table.
- [ ] Verify the source, fact date, reliability, and recency.
- [ ] Prefer the most recent fact when source reliability is comparable.
- [ ] Keep descriptions in English and use controlled sector labels.
- [ ] Use `NULL` for unknown values; do not overwrite existing values with blanks.
- [ ] Store monetary fields as numeric USD millions.
- [ ] Preview the update and inspect the audit.
- [ ] Apply inside a transaction.
- [ ] Verify the written record and scan text for encoding errors.
- [ ] Re-run the preview to confirm idempotence.
- [ ] Run `PRAGMA integrity_check` for database changes.
- [ ] Stage only related files and preserve unrelated local changes.
