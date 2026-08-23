---
name: database-completion
description: "Complete and enrich records in the Réseaux d'Acteurs IA database (tables: enterprises, investors) using reliable web sources (Wikipedia, Wikidata, Forbes AI 50, CB Insights, CompaniesMarketCap, AI Startups Europe): fill missing fields, import missing companies, map funding/market cap to capitalization, normalize countries, maintain the three-level sector ontology (label, group, domain), classify investor types, and deduplicate close name variants."
---

# Complétion de la Base de Données Réseaux d'Acteurs IA

## Vue d'ensemble

Ce skill guide le processus complet pour identifier et compléter les fiches dans la base de données **Réseaux d'Acteurs IA**. La base comporte deux tables principales :

- **`enterprises`** : entités opérationnelles (startups, scale-ups, grands groupes tech, labos).
- **`investors`** : entités dont l'activité principale est de déployer du capital.

Voir `conventions.md` §1.2 pour la règle de séparation entre les deux tables.

## Table `investors` — Champs spécifiques

Les champs suivants sont propres à la table `investors` (différents de `enterprises`) :

| Champ | Type | Description |
|-------|------|-------------|
| `investor_type` | TEXT | Catégorie (voir taxonomie dans `conventions.md` §2.2) |
| `ownership` | TEXT | Entité mère. Vide = investisseur autonome |
| `participations` | TEXT | Participations minoritaires (liste séparée par virgules) |
| `acquisitions` | TEXT | Prises de contrôle majoritaire |
| `capital_investi` | REAL | Capital déployé en USD millions |

**Règle participation vs acquisition :** voir `conventions.md` §2.3.

Lors de l'enrichissement d'un investisseur :
1. Identifier son `investor_type` en priorité (taxonomie en 6 groupes dans `conventions.md` §2.2).
2. Identifier `ownership` si l'investisseur est un bras d'une entité mère.
3. Enrichir `participations` à partir du champ `main_investors` des entreprises associées.
4. Description en anglais, 80–150 caractères recommandés.
5. `country` = pays du siège social (nom complet en anglais).

## Norme d'Encodage Projet (OBLIGATOIRE)

**UTF-8 est la norme d'encodage pour tout le projet** (scripts, CSV, JSON, Markdown, LaTeX, exports, logs).

Règles opérationnelles :

- Toujours lire/écrire les fichiers texte en UTF-8.
- Éviter les séquences d'échappement d'accents quand le format supporte UTF-8 (ex: LaTeX, Markdown, JSON).
- Pour les appels API texte : `Content-Type: application/json; charset=utf-8`.
- En PowerShell, forcer UTF-8 lors des opérations sensibles d'import/export.
- Contrôle qualité systématique des caractères corrompus (`Ã©`, `Ã¨`, `â€™`, `�`) après traitement.

Règle de correction :

- Si un artefact d'encodage est détecté, corriger immédiatement la source et régénérer l'export concerné.

## Leçons Réutilisables du Projet

- Pour une évolution temporelle, utiliser la table `enterprise_metrics_history` avec l'indicateur contrôlé `capitalization` et l'unité `usd_m`; convertir les milliards en millions avant insertion.
- Résoudre d'abord l'entité canonique dans la table appropriée (`enterprises` ou `investors`) et vérifier les variantes proches avant tout import. Par exemple, `Google` et `Alphabet` sont deux fiches distinctes dans le modèle actuel.
- Rendre les imports rejouables et non destructifs avec la clé logique `(enterprise_name, indicator, year)`; contrôler le nombre de lignes avant et après l'opération.
- Ne jamais compléter une année sans valeur fournie par une estimation implicite : conserver `NA` dans le fichier de travail ou `NULL` dans la base.
- Pour les notebooks d'analyse, conserver un JSON valide, des cellules identifiables, des textes de graphique en anglais et une validation d'exécution après chaque modification.
- Les images générées par les notebooks doivent être écrites dans `analyses/exports/images/`, quel que soit leur format; les CSV et les HTML restent dans `analyses/exports/`.

## Workflows Disponibles

- **Complétion qualitative (Wikipedia)** : enrichir description, website, capitalization, employees_count.
- **Complétion par batch (Wikidata)** : enrichir description, website, country, headquarter_city, main_investors avec contrôle du rate limit.
- **Import listes privées (Forbes AI 50, CB Insights AI 100)** : ajouter les entreprises absentes en deux phases (recherche puis application) et mapper `funding` vers `capitalization`.
- **Import sociétés cotées (CompaniesMarketCap)** : ajouter les absentes et mapper `market cap` vers `capitalization`.
- **Import annuaire européen massif (AI Startups Europe)** : crawler pagination (1312 fiches), extraire description + pays + website + secteur, puis insert/update.
- **Normalisation** : harmoniser `country` et `headquarter_city` en anglais, fusionner les variantes de labels sectoriels, régénérer `sector_domains`.
- **Dédoublonnage** : fusionner variantes de noms proches en conservant la fiche la plus riche.

## Ontologie Sectorielle à Trois Niveaux

`public/sector_ontology.csv` est la source unique du référentiel. Colonnes : `canonical_label`, `group`, `alias_terms`, `keyword_terms`, `description`, `domain`.

| Niveau | Colonne | Nombre | Usage |
|--------|---------|--------|-------|
| Label | `canonical_label` | 56 | Seule valeur autorisée dans `enterprises.sector` (5 max) |
| Groupe | `group` | 6 | Niveau intermédiaire hérité |
| Domaine | `domain` | 12 | Niveau méta : filtrage, agrégation, badge d'interface |

Principe : **ne jamais appauvrir `sector` pour simplifier une analyse**. Agréger au niveau `domain` à la place.

`enterprises.sector_domains` est un champ **dérivé** de `sector`, trié alphabétiquement. Le serveur le recalcule à chaque `POST` et `PUT`. Après un import en masse ou une édition du CSV, le régénérer avec `scripts/backfill_sector_domains.js`.

Pour réduire une variante de label, **ajouter un alias** dans `alias_terms` plutôt que créer un label. Un alias ne doit apparaître que dans une seule ligne du CSV : en cas de doublon, la dernière ligne l'emporte silencieusement.

## Scripts Réutilisables (Normalisation)

Les normalisations ponctuelles sont retirées après leur exécution. Conserver les règles et les audits, pas les scripts ad hoc qui modifient directement la base. Les utilitaires pérennes sont conçus pour être rejoués après import ou enrichissement.

- `scripts/normalize_sector_labels.js` : normalise le champ `sector`. Deux modes — `--aliases-only` fusionne uniquement les alias déclarés dans le CSV (**mode conservateur, à utiliser après un import**) ; sans ce drapeau, la classification par mots-clés s'ajoute et peut réaffecter des labels déjà canoniques.
- `scripts/audit_sector_label_variants.js` : inventaire en lecture seule des labels distincts et détection des doublons morphologiques (casse, accents, ponctuation, pluriels, `&`/`and`).
- `scripts/backfill_sector_domains.js` : régénère `enterprises.sector_domains` depuis `sector` et le CSV ; signale les labels sans domaine déclaré.
- `scripts/normalize_geo_english.js` : normalise `country` et `headquarter_city` en anglais, corrige alias/typos et convertit les placeholders (`NA`, `N/A`, etc.) en vide (`NULL`).
- `scripts/generate_relations_from_enterprises.py` : génère automatiquement des relations à partir des champs entreprise `main_investors`, `main_competitors`, `main_acquisitions`, `strategic_partnerships` (split par virgule), avec extraction optionnelle de date en parenthèses vers `start_date`.
- `scripts/cleanup_generated_relation_targets.py` : nettoyage post-génération des entreprises cibles (correction d'alias/typos, suppression des valeurs invalides). Le split des noms composites est volontairement **désactivé par défaut** et activable via `--split-composites`.

Exécution recommandée :

```bash
# Prévisualiser sans écrire
node scripts/audit_sector_label_variants.js
node scripts/normalize_sector_labels.js --aliases-only
node scripts/backfill_sector_domains.js
node scripts/normalize_geo_english.js
python scripts/generate_relations_from_enterprises.py

# Appliquer
node scripts/normalize_sector_labels.js --aliases-only --apply
node scripts/backfill_sector_domains.js --apply
node scripts/normalize_geo_english.js --apply
python scripts/generate_relations_from_enterprises.py --apply
```

Règle projet : les valeurs de données stockées en base doivent rester en anglais.

## Méthode Réutilisable : Import et Normalisation

Appliquer ce protocole à toute nouvelle liste externe ou à toute source dérivée de champs relationnels.

### 1. Préparer et comparer les identifiants

- Résoudre le chemin de la base relativement à la racine du dépôt; ne pas dépendre du répertoire courant.
- Normaliser les noms pour comparaison : minuscules, translittération des accents, retrait de la ponctuation et des suffixes légaux si nécessaire.
- Utiliser cette clé seulement pour détecter les candidats existants. En cas de plusieurs correspondances ou d'ambiguïté, ne pas fusionner automatiquement : consigner le cas pour revue.
- Ne jamais créer une fiche dont le nom est vide, un placeholder ou une valeur manifestement non entité.

### 2. Écrire de façon idempotente et non destructive

- Faire un inventaire avant écriture et produire un audit des décisions `created`, `updated`, `existing`, `skipped` et `ambiguous`.
- Pour une fiche existante, compléter uniquement les champs manquants. Ne jamais remplacer une valeur existante sans source plus fiable et plus récente, conformément au score de priorité.
- Pour une nouvelle fiche, fournir au minimum `name`, `organization_type`, `country` si la source le confirme, un secteur contrôlé et une description anglaise factuelle d'au moins 70 caractères.
- Affecter `is_validated = 3` aux entrées importées automatiquement tant qu'une validation humaine ou une source de niveau supérieur ne les a pas confirmées.
- Utiliser une transaction; effectuer un rollback complet en cas d'erreur.

### 3. Importer une liste sectorielle ou géographique

- Conserver la provenance exacte de la liste et sa date de consultation dans l'audit.
- Appliquer les données géographiques confirmées puis normaliser `country` et `headquarter_city` en anglais.
- Mapper le secteur source vers la taxonomie contrôlée du projet plutôt que de stocker des libellés libres tels que `Generative AI / LLM` ou `Healthtech / MedTech`.
- N'inférer aucun fait non documenté. Pour une information inconnue, conserver `NA` dans le fichier de travail ou `NULL` dans la base selon la convention du champ.

### 4. Importer des entités citées comme concurrents

- Extraire les noms des champs relationnels en séparant les valeurs par virgule et en retirant uniquement les précisions terminales entre parenthèses.
- Compter les citations et conserver l'entreprise source dans l'audit; la fréquence est un indice de priorité, pas une preuve de statut ou de secteur.
- Appliquer les règles canoniques de `conventions.md` pour les groupes et produits (par exemple, remapper les produits Microsoft vers `Microsoft`).
- Créer les entités absentes avec une description de provenance explicite, sans déduire leurs attributs métier à partir du seul nom ou du secteur de l'entreprise qui les cite.
- Ne pas remplir `main_competitors` de la nouvelle fiche avec l'entreprise source : cette relation doit être modélisée séparément ou validée avant écriture.

### 5. Contrôler avant et après application

1. Exécuter un mode aperçu qui ne modifie pas la base et examiner l'audit.
2. Vérifier les doublons de clés normalisées, les pays hors vocabulaire anglais, les secteurs hors taxonomie et les caractères corrompus.
3. Appliquer dans une transaction, puis produire les compteurs et un export CSV/JSON UTF-8 des décisions.
4. Contrôler un échantillon des créations et mises à jour dans l'API ou directement en base.

## Import en Deux Phases : Recherche puis Application

Pour un lot de plus d'une dizaine d'entreprises, séparer la recherche documentaire de l'écriture en base. Cette séparation rend la recherche rejouable, auditable et parallélisable.

### Phase 1 — Recherche

Découper la liste en batches d'une quinzaine d'entreprises et produire un fichier JSON par batch sous `exports/research/<source>_batch_<n>.json`. Chaque objet contient :

`input_name`, `name_official`, `website`, `country`, `headquarter_city`, `founded_year`, `funds_raised` (USD millions), `employees_count`, `main_investors`, `founders`, `description`, `sources` (URLs consultées), `confidence_notes`.

Règles :

- Un champ non confirmé par une page consultée reste `null`. Ne jamais compléter par déduction.
- Consigner dans `confidence_notes` tout écart entre sources, tout fait issu d'un simple extrait de résultat de recherche, et toute ambiguïté d'homonymie.
- Vérifier les homonymes : un nom court et courant (`Light`, `Alex`, `Parallel`, `Profound`) doit être recoupé avec la catégorie ou le secteur d'origine.

### Phase 2 — Application

Un script distinct lit tous les batches et écrit en base :

- champ `null` = aucune écriture, la valeur existante n'est jamais effacée ;
- portée limitée au lot importé, identifié par la ligne de provenance et `is_validated = 3` ;
- transaction unique avec rollback, sauvegarde préalable dans `database_backups/` ;
- audit JSON des décisions par fiche et par champ.

Conserver les fichiers de `exports/research/` après l'import : ils documentent les arbitrages pour la revue manuelle.

### Structure imposée des descriptions

Trois paragraphes, dans cet ordre, en anglais :

1. **Histoire** — fondation, fondateurs, tours de financement, faits marquants datés.
2. **Proposition de valeur** — produit, technologie, problème adressé.
3. **Modèle économique** — facturation, clients, canaux de distribution.

Ajouter en dernière ligne la provenance (source et catégorie d'origine). Cette ligne sert ensuite de marqueur pour isoler le lot dans l'interface via la recherche tous champs.

## Politique de Priorisation des Sources (OBLIGATOIRE)

Pour toute création ou mise à jour de fiche, prioriser les informations avec une pondération
"récence x fiabilité" (trustworthiness), pas uniquement la présence de la donnée.

### 1. Score de fiabilité de la source

Attribuer un score de fiabilité `F` par type de source :

- `1.00` : filings réglementaires / investor relations / rapport annuel officiel / communiqué officiel.
- `0.90` : base de référence structurée reconnue (Wikidata vérifiée, CompaniesMarketCap pour market cap).
- `0.80` : page encyclopédique maintenue (Wikipedia EN/FR) avec citations cohérentes.
- `0.60` : presse tech/business sérieuse.
- `0.40` : annuaires secondaires et agrégateurs non officiels.

### 2. Score de récence de l'information

Attribuer un score de récence `R` à partir de la date du fait (pas la date de crawl) :

- `1.00` : <= 3 mois
- `0.90` : <= 12 mois
- `0.75` : <= 24 mois
- `0.55` : <= 36 mois
- `0.35` : > 36 mois
- `0.20` : date inconnue

### 3. Score de priorité final

Pour chaque champ candidat, calculer :

`priorite = 0.65 * F + 0.35 * R`

Règles de décision :

- Conserver la valeur avec le score `priorite` le plus élevé.
- En cas d'écart `< 0.05`, préférer la source la plus fiable (`F` le plus élevé).
- Si la source la plus fiable est plus ancienne mais documente un fait structurel stable
  (ex: année de fondation), la conserver.
- Pour les champs volatils (`capitalization`, `employees_count`, `revenue_millions`),
  privilégier la donnée la plus récente parmi les sources de fiabilité proche.

### 4. Application par type de champ

- `capitalization` : priorité aux sources marché/IR les plus récentes, puis CompaniesMarketCap.
- `revenue_millions` : priorité aux rapports annuels/IR.
- `employees_count` : priorité aux rapports annuels/IR, puis Wikipedia récente.
- `main_acquisitions` et `strategic_partnerships` : valider l'année et ne conserver que
  les événements significatifs et datés.

### 5. Traçabilité minimale

Chaque enrichissement doit conserver dans le script/log :

- source retenue,
- date du fait,
- score `F`, score `R`, score `priorite`,
- raison du choix en cas d'arbitrage.

## Workflow Recommandé

## Convention Visuelle Pays

Quand un script ou un notebook produit une visualisation par pays, réutiliser la convention du notebook d'analyse compétitive :

- couleurs forcées pour les pays hors Europe les plus structurants,
- palette verte pour les pays européens,
- palette de repli stable pour les autres pays,
- même libellé pays dans les légendes et les exports.

Si un helper partagé existe dans `analyses/country_palette.py`, le réutiliser plutôt que redéfinir une palette locale.

### 1. Identifier les Fiches Incomplètes

Créer un script de diagnostic qui liste toutes les entreprises avec champs manquants :

```javascript
// complete_enterprises_diagnostic.js
async function identifyIncomplete() {
  const response = await fetch('http://localhost:3000/api/enterprises');
  const enterprises = await response.json();
  
  const incomplete = enterprises.filter(e => 
    !e.description || !e.website || !e.capitalization
  );
  
  console.log(`Total: ${enterprises.length}, Incomplètes: ${incomplete.length}`);
  incomplete.forEach(e => {
    console.log(`- ${e.name}: description=${!!e.description}, website=${!!e.website}, capitalization=${!!e.capitalization}`);
  });
}
```

**Critères de complétude :**
- ✓ Description : texte détaillé (min 100 caractères)
- ✓ Site Web : URL fonctionnelle
- ✓ Capitalisation : montant en USD ou devise
- ✓ Nombre d'employés : nombre entier (optionnel mais recommandé)

### 2. Rechercher les Données via Wikipedia

Pour chaque entreprise, consulter les sources publiques (Wikipedia prioritaire) :

**Requête recommandée :**
```
https://en.wikipedia.org/wiki/[CompanyName]
ou
https://fr.wikipedia.org/wiki/[CompanyName]
```

**Champs à extraire :**
- Fondation (date, fondateurs)
- Secteur d'activité
- Produits principaux
- Statut (licorne, valorisation)
- Nombre d'employés
- Site officiel

**Format pour la description :**
```
[Nom] est une entreprise [nationalité] spécialisée dans [secteur]. 
Fondée en [date] par [fondateurs], [nom] développe [produits]. 
[Statut/valorisation]. [Nombre employés].
```

### 3. Mise à Jour Ciblée via API

**Approche préconisée :** Mise à jour par entreprise (plutôt qu'en masse)

Pour éviter les erreurs 400, utiliser la stratégie PUT avec payload complète :

```powershell
$jsonData = @'
{
  "name": "CompanyName",
  "sector": "LLM",
  "country": "France",
  "founded_year": 2023,
  "description": "Description détaillée...",
  "website": "https://company.com",
  "logo_url": null,
  "capitalization": "1 milliard USD",
  "employees_count": 100
}
'@

$bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonData)
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/enterprises/[ID]" `
  -Method PUT `
  -ContentType "application/json; charset=utf-8" `
  -Body $bytes `
  -UseBasicParsing

Write-Host "Status: $($response.StatusCode)"
```

### 4. Gestion de l'Encodage UTF-8

**IMPORTANT :** Les accents français doivent être correctement encodés.

**Bonnes pratiques :**
- ✓ Toujours spécifier `charset=utf-8` dans le header Content-Type
- ✓ Convertir le JSON en bytes UTF-8 : `[System.Text.Encoding]::UTF8.GetBytes($data)`
- ✓ Vérifier après mise à jour : `description` doit afficher les accents (é, è, ç, etc.)
- ✓ Tester avec : `Invoke-WebRequest ... | ConvertFrom-Json | Select-Object -ExpandProperty description`

#### Règle Générale Anti-Mojibake (OBLIGATOIRE)

Pour tous les enrichissements contenant des accents, appliquer ce protocole :

1. **Préférer Node.js pour les écritures API** (évite les pièges d'encodage console PowerShell).
2. **Éviter les payloads inline PowerShell avec accents** quand c'est possible.
3. **Si PowerShell est requis** :
   - Forcer UTF-8 en entrée/sortie :
     - `$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)`
     - `chcp 65001`
   - Envoyer le body en bytes UTF-8 (`GetBytes`) avec `application/json; charset=utf-8`.
4. **Contrôle post-write systématique** : scanner les champs texte pour détecter `�` (U+FFFD).
5. **En cas de `�` détecté** :
   - Corriger immédiatement la fiche depuis une source fiable.
   - Refaire la mise à jour en UTF-8 strict.

Exemple de contrôle rapide Node.js :

```javascript
const e = await fetch('http://localhost:3000/api/enterprises/111').then(r => r.json());
for (const f of ['name','sector','country','description','funds_raised','main_investors']) {
  if (typeof e[f] === 'string' && e[f].includes('�')) {
    console.log('ENCODING_ISSUE', f, e[f]);
  }
}
```

### 5. Validation Post-Mise à Jour

Après chaque mise à jour, vérifier :

```powershell
# Récupérer la fiche mise à jour
Invoke-WebRequest -Uri "http://localhost:3000/api/enterprises/[ID]" -UseBasicParsing | 
  Select-Object -ExpandProperty Content | 
  ConvertFrom-Json | 
  Select-Object name, description, website, capitalization, employees_count
```

Vérifier visuellement dans le navigateur à `http://localhost:3000` :
- Description affichée complètement
- Accents corrects
- Liens externes valides

### 6. Importer depuis Forbes AI 50

Objectif : ajouter uniquement les entreprises absentes et renseigner `capitalization` à partir de la valeur `funding`.

**Règles de mapping conseillées :**
- `funding` Forbes (`$60 B`, `$830 M`) -> `capitalization` (`60 B USD`, `830 M USD`)
- `founded` -> `founded_year`
- `location` -> `country` (normalisé EN)
- `category` -> `sector`

**Stratégie d'anti-doublon :**
- Normaliser le nom (lowercase + suppression accents + suppression ponctuation)
- Comparer ce nom normalisé à l'existant avant `POST /api/enterprises`

### 7. Importer depuis CompaniesMarketCap

Objectif : ajouter les entreprises IA cotées manquantes et mapper `market cap` vers `capitalization`.

**Règles de mapping conseillées :**
- `market cap` (`$5.020 T`, `$365.96 B`) -> `capitalization` (`5.020 T USD`, `365.96 B USD`)
- `country` de la table -> `country` (normalisé EN)
- `sector` par défaut pour les nouvelles entrées : `Entreprise IA cotée (market cap)`

**Alias recommandés (éviter doublons de variante) :**
- `Alphabet (Google)` -> `Google`
- `Meta Platforms (Facebook)` -> `meta`
- `Cerebras Systems` -> `Cerebras`
- `MiniMax Group` -> `MiniMax`

### 8. Normaliser les Champs Country et Headquarter City

Après imports multi-sources, harmoniser les pays et villes en anglais (exemples):
- `Etats-unis` / `États-Unis` -> `United States`
- `Taïwan` -> `Taiwan`
- `Hambourg` -> `Hamburg`
- `Fribourg-en-Brisgau` -> `Freiburg im Breisgau`
- `Tübingen` -> `Tuebingen`

Appliquer aussi :
- Valeurs blanches (`""`, espaces) -> `NULL`
- Placeholders (`NA`, `N/A`, `null`, `unknown`) -> `NULL`

### 9. Import Annuaire AI Startups Europe (1312)

Objectif : importer massivement des startups européennes et enrichir automatiquement les fiches existantes.

Méthode recommandée :
1. Crawler la pagination (`/`, `/p2`, `/p3`, ...).
2. Parser chaque `li.startups-list-item` pour extraire : nom, description, pays, secteur, website.
3. Dédupliquer par nom normalisé (avec suppression des suffixes légaux : GmbH, Inc, Ltd, etc.).
4. Créer les absentes en base.
5. Mettre à jour les existantes uniquement si des champs sont manquants.
6. Générer un audit JSON détaillé.

Script de référence : archivé dans `archives/manual_ops/` après exécution.

Résultat observé sur ce projet :
- 132 pages crawlées, 1312 lignes sources, 1301 uniques
- 1294 insertions, 6 updates, 0 erreurs

### 10. Enrichissement Wikipedia/Wikidata Résilient

Objectif : compléter automatiquement les fiches restantes (description prioritaire), puis `headquarter_city` et `main_investors` quand disponibles.

Stratégie recommandée :
1. **Premier passage Wikidata** (préféré): plus stable face aux limites de requêtes.
2. **Fallback Wikipedia** : uniquement pour les cas non trouvés.
3. Exécuter en **batchs** (ex: 60 entreprises/run) pour éviter les blocages longs.
4. Implémenter un **backoff exponentiel** en cas de 429.
5. Garder un matching conservateur pour éviter les faux positifs.

Astuce batch :
- traiter par lots d'environ 60 entreprises pour monitorer la progression et limiter les blocages.

### 11. Export des Fiches à Traiter

Objectif : produire rapidement une file de travail pour les enrichissements manuels restants.

Sortie : `exports/entreprises_sans_description.csv`

Colonnes recommandées :
- `id`, `name`, `country`, `headquarter_city`, `sector`, `website`, `founded_year`, `capitalization`, `employees_count`, `main_investors`

## Problèmes Connus et Solutions

### Erreur 400 sur PUT

**Symptôme :** `Invoke-WebRequest` retourne 400 sans message d'erreur

**Causes potentielles :**
- Payload incomplet (tous les champs requis doivent être présents)
- Encodage UTF-8 incorrect
- Données invalides (ex: longueur excessive)

**Solutions :**
1. Inclure tous les champs (name, sector, country, founded_year, description, website, logo_url, capitalization, employees_count)
2. S'assurer que le Content-Type inclut `charset=utf-8`
3. Tester avec `ConvertFrom-Json` pour valider la structure JSON
4. Utiliser `$null` pour les champs vides (pas de chaînes vides)

### Accents mal encodés

**Symptôme :** Description affiche `sp©cialis©e` au lieu de `spécialisée`

**Solution :**
```powershell
# Toujours convertir en bytes UTF-8
$bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonData)
$response = Invoke-WebRequest ... -Body $bytes
```

### Problèmes de Formulaire Browser

**Symptôme :** Clic sur "Enregistrer" timeout après 10000ms

**Workaround :**
- Utiliser l'API directement via PowerShell/Node.js plutôt que l'interface browser
- Les scripts sont plus fiables et reproducibles

### Erreurs de parsing web (403 / contenu dynamique)

**Symptôme :** la table source n'est pas parseable directement.

**Solutions :**
1. Toujours envoyer un `User-Agent` navigateur dans les requêtes HTTP.
2. Préférer le parsing HTML avec sélecteurs explicites (`company-name`, cellule market cap).
3. Si une source est dynamique, utiliser un fallback (wikitext raw pour Wikipedia).

### Erreur 429 (Too Many Requests) sur Wikipedia/Wikidata

**Symptôme :** échec massif d'enrichissement après quelques dizaines de requêtes.

**Solutions :**
1. Ajouter un `User-Agent` explicite.
2. Appliquer un backoff exponentiel (`1.5s`, `3s`, `6s`, ...).
3. Réduire la taille de batch (`MAX_TARGETS=40` à `60`).
4. Privilégier Wikidata pour les enrichissements de masse.
5. Relancer en plusieurs passes plutôt qu'un run unique très long.

## Checklist de Complétion

Pour chaque entreprise à compléter :

- [ ] Trouver au moins 2 sources candidates (dont 1 source haute fiabilité si possible)
- [ ] Extraire : description, website, capitalization, employees_count
- [ ] Calculer la priorité récence x fiabilité pour les champs volatils
- [ ] Rédiger description en français avec accents corrects
- [ ] Créer JSON avec tous les champs requis
- [ ] Encoder en UTF-8 et envoyer via PUT
- [ ] Vérifier status 200
- [ ] Valider affichage dans le browser
- [ ] Vérifier accents français
- [ ] Documenter la source retenue + date + justification d'arbitrage

## Checklist d'Import Externe

- [ ] Créer une sauvegarde locale de `database.db` avant import/fusion
- [ ] Extraire la liste source (Forbes/CompaniesMarketCap)
- [ ] Normaliser les noms pour la comparaison anti-doublon
- [ ] Mapper funding/market cap -> `capitalization`
- [ ] Ajouter uniquement les absentes via `POST /api/enterprises`
- [ ] Normaliser `country` en français après import
- [ ] Vérifier le total d'entreprises avant/après
- [ ] Produire un fichier d'audit JSON (inserted, skipped, errors)

## Résultats Observés

À partir d'une base de 47 entreprises avec 38 incomplètes :
- ✓ Approche ciblée Wikipedia = 100% de succès (0 erreurs 400)
- ✓ Accents UTF-8 correctement gérés
- ✓ Description, website, capitalization complétées
- ✓ Données validées et affichées correctement

Exemple : Fiche **01.AI** (ID 27) complétée avec succès :
- Description : Compagnie chinoise de LLM, fondée mars 2023, Kai-Fu Lee
- Website : https://www.01.ai
- Capitalization : 1 milliard USD
- Employees : 100

Importations externes validées :
- **Forbes AI 50** : ajout des absentes avec `funding -> capitalization`
- **CompaniesMarketCap AI** : ajout des absentes avec `market cap -> capitalization`
- **Normalisation pays** : harmonisation en français post-import

## Ressources

**Sources de données fiables :**
- Wikipedia EN/FR (prioritaire)
- Sites officiels (domain + about page)
- Crunchbase (pour capitalization/employees)
- AngelList (pour startups)

**Scripts réutilisables :**
- `complete_enterprises_diagnostic.js` : Identifier les incomplètes
- PowerShell template pour mise à jour via API
- `import_forbes_ai50_manual.py` : Import Forbes AI 50
- `import_companiesmarketcap_ai.py` : Import CompaniesMarketCap AI
- `normalize_countries.py` : Normalisation pays
- `deduplicate_enterprises.py` : Fusion contrôlée de doublons

## Notes pour les Futures Exécutions

1. **Bulk vs Ciblée :** La mise à jour par entreprise est plus fiable que le bulk update
2. **Validation :** Toujours vérifier les accents après mise à jour
3. **Encodage :** UTF-8 est critique pour le français
4. **Fiabilité API :** Les imports doivent passer par une phase anti-doublon normalisée
5. **Sécurité donnée :** Toujours créer un backup avant toute opération de fusion/suppression
6. **Scalabilité enrichissement :** Pour > 200 fiches incomplètes, préférer des batchs Wikidata + export CSV de backlog
7. **Arbitrage qualité :** appliquer systématiquement la politique de score `priorite = 0.65 * F + 0.35 * R` avant toute écriture

## Schéma Actuel — Table `enterprises`

Colonnes supplémentaires ajoutées (migrations automatiques au démarrage du serveur) :

| Colonne | Type | Usage |
|---|---|---|
| `end_year` | INTEGER | Année de fin d'activité (acquisition, faillite…) |
| `end_reason` | TEXT | `Acquisition` / `Bankruptcy` / `Merger` / `Closure` |
| `company_status` | TEXT | `Active` / `Acquired` / `Bankrupt` / `Inactive` — défaut `Active` |

**Règle UX :** si `end_year` est renseigné, le bouton « Confirm dead company » dans l'interface auto-remplit `company_status` selon `end_reason`.

**Champs monétaires :** `capitalization`, `funds_raised`, `revenue_millions` — tous en **USD millions** (numérique, séparateur `.`).

## Taxonomie Secteurs

Voir la section « Ontologie Sectorielle à Trois Niveaux » plus haut. Le référentiel vit exclusivement dans `public/sector_ontology.csv` ; aucune liste de labels ne doit être recopiée ailleurs, sous peine de divergence.

Règles de mapping structurantes :

- `ICT` est un repli : il est retiré dès qu'un label plus spécifique est présent.
- `Aerospace & Defence` est éclaté en `Aerospace` + `Defence` ; ne jamais fusionner ces deux labels.
- Les filiales sont remappées vers leur entité canonique selon `conventions.md` §1.3 à §1.6.

## Analyse Concurrentielle (Notebook)

Script : `analyses/competition_analysis.ipynb`

Pipeline :
1. Export SQL top-N entreprises par `MAX(capitalization, funds_raised)`
2. Nettoyage + normalisation sémantique des concurrents (filiales → groupe parent, via `SEMANTIC_ALIASES`)
3. Format long → agrégation → matrice de cooccurrence symétrique (M + Mᵀ)
4. Projection MDS 2D
5. Visualisation Plotly interactive (hover avec fiche entreprise, taille ∝ citations)
6. Export HTML : `analyses/exports/competition_map_2d.html`

**Astuce Node.js pour mise à jour rapide :**
```javascript
node -e "fetch('http://localhost:3000/api/enterprises/ID', {method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({...data})}).then(r=>r.json()).then(console.log)"
```

## Organisation des Scripts

- `scripts/` ne contient que les outils récurrents et maintenus ; leur inventaire à jour est dans `scripts/README.md`.
- `scripts/lib/` regroupe le socle commun : chemin de base résolu depuis la racine, helpers SQLite promisifiés, transactions, lecture de l'ontologie, affichage aperçu/application.
- `archives/manual_ops/` conserve les imports et correctifs ponctuels déjà exécutés, pour traçabilité uniquement.

Ne jamais recopier dans ce skill la liste des scripts : elle diverge immédiatement. S'y référer par le README du dossier.
