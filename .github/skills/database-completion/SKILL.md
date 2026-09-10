---
name: database-completion
description: "Complete, enrich, normalize, and audit the Réseaux d'Acteurs IA database without destructive updates or duplicate entities."
---

# Database Completion

This skill governs durable updates to the project's `enterprises` and `investors` tables. Use `conventions.md` as the domain authority and `public/sector_ontology.csv` as the sole sector vocabulary.

## Data Rules

- Keep operational entities in `enterprises` and capital-deploying entities in `investors`. Resolve ambiguous cases with `conventions.md` before writing.
- Resolve the canonical entity before importing. Compare normalized names, inspect close variants, and record ambiguous matches instead of merging automatically.
- Store project data in English: `country`, `headquarter_city`, sector labels, and descriptions. New descriptions should be factual English text of at least 70 characters.
- Store unknown values as `NULL` in the database or `NA` in working files. Never infer an unconfirmed fact.
- Store monetary values as numeric USD millions. Use `enterprise_metrics_history` with indicator `capitalization` and unit `usd_m` for historical values.
- Keep `is_validated = 3` for automatically imported records until human or higher-confidence validation is available.
- Preserve existing values by default. Replace a value only when a more reliable and more recent source justifies it.

## Sources and Prioritization

Prefer primary sources and current facts. For competing values, use:

`priority = 0.65 * reliability + 0.35 * recency`

Reliability guide:

- `1.00`: regulatory filings, investor relations, annual reports, official releases.
- `0.90`: verified structured references such as Wikidata or CompaniesMarketCap.
- `0.80`: maintained encyclopedic sources with consistent citations.
- `0.60`: reputable business or technology press.
- `0.40`: secondary directories and unverified aggregators.

When two sources are otherwise comparable, prefer the most recent fact. Keep an older source when it documents a stable structural fact, such as a founding year, or when it is materially more reliable. For volatile fields such as `capitalization`, `employees_count`, and `revenue_millions`, prefer the most recent value when source reliability is comparable. Record the selected source, fact date, scores, and arbitration reason in the audit.

## Sector Ontology

`public/sector_ontology.csv` is the only sector vocabulary. `sector` accepts canonical labels only, with a maximum of five labels per enterprise. The ontology has three levels:

- `canonical_label`: fine-grained label stored on the enterprise.
- `group`: intermediate grouping.
- `domain`: higher-level aggregation and filtering.

Use aliases in `alias_terms` instead of creating duplicate labels. `sector_domains` is derived from `sector`; regenerate it after bulk imports or ontology edits with the repository utility.

## Import Workflow

Apply the same workflow to external CSVs, research batches, and relation-derived imports:

1. Inspect the source encoding, headers, row count, provenance, and duplicate files. If two files are identical, select one canonical source.
2. Normalize names only for matching. Do not use a normalized key to overwrite a canonical name without review.
3. Produce a read-only preview with decisions such as `created`, `updated`, `skipped`, and `ambiguous`.
4. Apply changes in one transaction. New records require at least `name`, a controlled sector when known, a confirmed country when available, and a factual description when the source provides one.
5. For existing records, fill missing fields only unless the source-priority policy explicitly supports replacement. Never erase existing values because the source is blank.
6. Keep provenance and field-level decisions in an audit file. Preserve research files used to justify the import.
7. Run the preview again after applying. A replayable import should produce zero new creations and zero new updates.

The maintained CSV utility is `scripts/import_af_complements.js`; it previews by default and applies with `--apply`. Other utilities are documented in `scripts/README.md` and should not be copied into this skill as a second inventory.

## Validation and Publication

After applying a database update:

1. Check for duplicate canonical entities, invalid countries, uncontrolled sector labels, empty required names, and encoding artifacts such as `Ã`, `â€™`, or `�`.
2. Run `PRAGMA integrity_check` and compare the main table counts before and after the operation.
3. Inspect a sample of created and updated records through SQLite or the API.
4. Check `git status` and stage only files belonging to the update. Preserve unrelated user changes.
5. Commit and push the database and durable audit or script changes. Confirm that the local branch is clean and synchronized with the remote.

The local repository and its `database.db` are the source of truth for publication. Do not add one-off patches, temporary filenames, or session-specific observations to this skill.

## Encoding

All project text files and exports use UTF-8. API payloads must declare `application/json; charset=utf-8`. After writes, scan relevant text fields for replacement characters or mojibake and correct the source before continuing.

## Investor-Specific Fields

For `investors`, classify `investor_type` first, then record `ownership`, minority `participations`, majority `acquisitions`, and `capital_investi` in USD millions. In uncertain cases, use `participations` rather than `acquisitions`.

## Safety

Create a database backup before bulk imports, destructive merges, deletions, deduplication, or replacement of existing values. For small non-destructive imports, use the transaction and validation workflow above. Never treat a preview as an applied update.
