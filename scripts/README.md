# Scripts

Ce dossier contient les scripts opérationnels récurrents et maintenus.

## Familles de scripts

- Normalisation : `normalize_geo_english.js`, `normalize_sector_labels.js`, `normalize_all_entity_lists.js`, `normalize_competitor_names.js`.
- Relations : `generate_relations_from_enterprises.py`, `cleanup_generated_relation_targets.py`, `enrich_relations_from_enterprises.js`.
- Enrichissement : `enrich_top500_websites_logos.js`, `infer_country_from_description.js`.
- Imports : `import_sifted_ai100_2025.js` et variantes documentées dans leurs en-têtes.
- Migration : `migrate_enterprises_investor_type_to_investors.js`, avec mode `--dry-run`.

Les scripts qui modifient la base doivent être exécutés avec leur mode aperçu ou dry-run lorsque celui-ci existe. Les opérations ponctuelles non maintenues restent dans `archives/manual_ops/`.

## Conventions d'exécution

- Depuis la racine du dépôt, pour que les chemins relatifs vers `database.db` soient stables.
- Utiliser UTF-8 pour les entrées/sorties texte.
- Conserver les valeurs monétaires en millions de dollars US lorsque le champ est suffixé `_millions` ou `capitalization`.
- Produire un audit avant/après pour les imports et ne jamais remplacer une donnée confirmée sans arbitrage documenté.

Les scripts ponctuels (imports one-shot, correctifs ad hoc, opérations manuelles) sont conservés dans :

- ../archives/manual_ops/
