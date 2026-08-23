# Scripts

Outils récurrents et maintenus. Toute opération ponctuelle déjà exécutée est archivée dans [`../archives/manual_ops/`](../archives/manual_ops/).

## Module partagé `lib/`

Les scripts s'appuient sur quatre modules communs plutôt que de redupliquer leur socle technique :

| Module | Rôle |
|--------|------|
| `lib/db.js` | Chemin de la base résolu depuis la racine du dépôt, helpers `all` / `get` / `run` promisifiés, `withTransaction`, drapeau `APPLY` |
| `lib/ontology.js` | Lecture unique de `public/sector_ontology.csv` avec parseur CSV gérant les champs entre guillemets, validation de l'en-tête, dérivation des domaines |
| `lib/text.js` | Clés de comparaison de noms, suppression des diacritiques, découpage et recomposition des listes séparées par virgules |
| `lib/report.js` | Affichage uniforme aperçu / application et écriture des audits JSON sous `exports/` |

## Scripts disponibles

### Secteurs

| Script | Écrit | Rôle |
|--------|:-----:|------|
| `audit_sector_label_variants.js` | non | Inventaire des labels utilisés, détection des variantes morphologiques et des labels hors ontologie. Option `--min N`. |
| `normalize_sector_labels.js` | oui | Normalise `sector`. `--aliases-only` fusionne les seuls alias déclarés (conservateur) ; sans le drapeau, la classification par mots-clés s'ajoute. |
| `backfill_sector_domains.js` | oui | Régénère `sector_domains` depuis `sector` et l'ontologie. |
| `enrich_sectors_from_descriptions.js` | oui | Propose des labels supplémentaires déduits des descriptions. |

### Géographie et entités

| Script | Écrit | Rôle |
|--------|:-----:|------|
| `normalize_geo_english.js` | oui | Harmonise `country` et `headquarter_city` en anglais, convertit les placeholders en `NULL`. |
| `infer_country_from_description.js` | oui | Déduit le pays manquant à partir de la description et de la ville. |
| `normalize_all_entity_lists.js` | oui | Aligne les listes d'entités sur les noms canoniques de la table `enterprises`. |
| `normalize_competitor_names.js` | oui | Déduplique et normalise `main_competitors`. |
| `migrate_investors_from_enterprises.js` | oui | Déplace vers `investors` les fiches dont l'activité principale est de déployer du capital, en reportant les citations dans `participations`. Option `--ids` pour les cas hors `organization_type = 'Investor'`. |

### Relations et enrichissement

| Script | Écrit | Rôle |
|--------|:-----:|------|
| `generate_relations_from_enterprises.py` | oui | Génère les relations depuis les champs texte de `enterprises`. |
| `cleanup_generated_relation_targets.py` | oui | Nettoie les cibles générées. `--split-composites` désactivé par défaut. |
| `enrich_relations_from_enterprises.js` | oui | Complète les relations existantes. |
| `normalize_partnership_types_english.js` | oui | Normalise `partnerships.partnership_type`. |
| `enrich_top500_websites_logos.js` | non | Identifie les sites et logos manquants sur le top 500. |

## Conventions d'exécution

- **Aperçu d'abord.** Les scripts d'écriture sont en mode aperçu par défaut ; ajouter `--apply` pour écrire.
- **Sauvegarder** `database.db` dans `database_backups/` avant toute application massive.
- Le chemin de la base est résolu depuis la racine du dépôt : les scripts fonctionnent quel que soit le répertoire courant.
- Encodage UTF-8 en entrée comme en sortie ; valeurs stockées en base en anglais.
- Montants en millions de dollars US pour `capitalization`, `funds_raised` et les champs suffixés `_millions`.

## Ordre recommandé après un import

```bash
node scripts/normalize_geo_english.js --apply
node scripts/normalize_sector_labels.js --aliases-only --apply
node scripts/backfill_sector_domains.js --apply
node scripts/audit_sector_label_variants.js
```
