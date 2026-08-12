---
name: database-completion
description: "Complete and enrich records in the Réseaux d'Acteurs IA database (tables: enterprises, investors) using reliable web sources (Wikipedia, Wikidata, Forbes AI 50, CompaniesMarketCap, AI Startups Europe): fill missing fields, import missing companies, map funding/market cap to capitalization, normalize countries, classify investor types, and deduplicate close name variants."
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

## Workflows Disponibles

- **Complétion qualitative (Wikipedia)** : enrichir description, website, capitalization, employees_count.
- **Complétion par batch (Wikidata)** : enrichir description, website, country, headquarter_city, main_investors avec contrôle du rate limit.
- **Import listes privées (Forbes AI 50)** : ajouter les entreprises absentes et mapper `funding` vers `capitalization`.
- **Import sociétés cotées (CompaniesMarketCap)** : ajouter les absentes et mapper `market cap` vers `capitalization`.
- **Import annuaire européen massif (AI Startups Europe)** : crawler pagination (1312 fiches), extraire description + pays + website + secteur, puis insert/update.
- **Normalisation** : harmoniser `country` et `headquarter_city` en anglais, homogénéiser les formats de capitalisation.
- **Dédoublonnage** : fusionner variantes de noms proches en conservant la fiche la plus riche.

## Scripts Réutilisables (Normalisation)

Ces scripts sont conçus pour être rejoués après imports/enrichissements.

- `scripts/normalize_sectors_labels.js` : normalise le champ `sector` avec taxonomie contrôlée (labels séparés par virgules, max 3 labels).
- `scripts/normalize_geo_english.js` : normalise `country` et `headquarter_city` en anglais, corrige alias/typos et convertit les placeholders (`NA`, `N/A`, etc.) en vide (`NULL`).
- `scripts/generate_relations_from_enterprises.py` : génère automatiquement des relations à partir des champs entreprise `main_investors`, `main_competitors`, `main_acquisitions`, `strategic_partnerships` (split par virgule), avec extraction optionnelle de date en parenthèses vers `start_date`.
- `scripts/cleanup_generated_relation_targets.py` : nettoyage post-génération des entreprises cibles (correction d'alias/typos, suppression des valeurs invalides). Le split des noms composites est volontairement **désactivé par défaut** et activable via `--split-composites`.

Exécution recommandée :

```bash
# Prévisualiser sans écrire
node scripts/normalize_sectors_labels.js
node scripts/normalize_geo_english.js
python scripts/generate_relations_from_enterprises.py
python scripts/cleanup_generated_relation_targets.py --min-id 1615

# Appliquer
node scripts/normalize_sectors_labels.js --apply
node scripts/normalize_geo_english.js --apply
python scripts/generate_relations_from_enterprises.py --apply
python scripts/cleanup_generated_relation_targets.py --min-id 1615 --apply
```

Règle projet : les valeurs de données stockées en base doivent rester en anglais.

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

Script de référence :
- `analyses/import_ai_startups_europe_1312.py`

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

Scripts de référence :
- `analyses/enrich_missing_profiles_wikidata.py`
- `analyses/enrich_missing_profiles_wikipedia.py`

Astuce batch :
- `MAX_TARGETS=60` pour traiter par lots et monitorer la progression.

### 11. Export des Fiches à Traiter

Objectif : produire rapidement une file de travail pour les enrichissements manuels restants.

Script :
- `analyses/export_missing_descriptions.py`

Sortie :
- `exports/entreprises_sans_description.csv`

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

## Taxonomie Secteurs (25 labels canoniques)

```
Aerospace | Agriculture & Forestry | AI model | Biotech | Cloud Provider
Computer Vision | Construction | Data | Defence | Education
Energy & Utilities | Financial Services | Hardware | Health & Social Care
IT & Security | Manufacturing & Operations | Media & Entertainment
Professional Services | Public Sector | R&D | Real Estate Activities
Retail & E-commerce | Robotics | Sales & Marketing | Transport & Mobility
```

Script de (re)normalisation : `analyses/normalize_sector_labels.js --apply`

**Mappings importants :**
- `ICT` → label supprimé du picker (données existantes conservées)
- `Aerospace & Defence` → éclaté en `Aerospace` + `Defence`
- `Manufacturing` + `Operations` → `Manufacturing & Operations`
- `Sales` + `Marketing` → `Sales & Marketing`
- Filiales mappées vers groupe parent : YouTube/DeepMind → `Alphabet`, Instagram/WhatsApp → `Meta Platforms`, etc.

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

## Nouveaux Scripts Opérationnels

- `analyses/import_ai_startups_europe_1312.py`
- `analyses/enrich_missing_profiles_wikipedia.py`
- `analyses/enrich_missing_profiles_wikidata.py`
- `analyses/normalize_countries_post_ai_europe.py`
- `analyses/export_missing_descriptions.py`
