# Conventions

Ce document centralise les conventions du projet.
Il est conçu pour être enrichi progressivement, par domaine.

---

## 1. Définition des entités

### 1.1 Principe général

- Les listes de concurrents doivent contenir des entités opérationnelles comparables.
- On privilégie les entités qui agissent réellement sur un marché (produits, plateformes, business units, filiales opérantes).
- Les holdings et structures d'investissement ne doivent pas être mélangées avec les entités opérationnelles dans les listes de concurrents.

### 1.2 Table `enterprises` vs table `investors`

Le projet distingue deux tables distinctes :

- **`enterprises`** : entités opérationnelles (startups, scale-ups, grands groupes tech, labos) dont l'activité principale est de créer des produits ou services.
- **`investors`** : entités dont l'activité principale est de déployer du capital (VC, PE, fonds souverains, banques, Holdings, etc.).

**Règle de séparation :**
- Un investisseur qui possède aussi des produits (ex: SoftBank) reste dans `investors`.
- Une entreprise tech qui investit marginalement (ex: Microsoft → OpenAI) reste dans `enterprises`.
- Le critère est l'**activité principale** déclarée.

### 1.3 Règle d'application pour les listes de concurrents

- `Alphabet` est traité comme investisseur (holding) et non comme entité concurrente opérationnelle de premier niveau.
- Les entités à utiliser dans les listes de concurrents sont:
  - `Google` (incluant `Google Search`, `YouTube`, `Chrome`, `Translate`, `Assistant`)
  - `Google Cloud` (incluant `TPU`)
  - `Waymo`
  - `DeepMind` (incluant `Antigravity`)
- Si une source mentionne `Alphabet` comme concurrent, remapper vers l'entité opérationnelle pertinente.
- En cas d'ambiguïté, utiliser `Google` par défaut.

### 1.4 Liste des entités : Meta

- `Meta` est l'entité corporate de référence dans les listes de concurrents.
- Remapper vers `Meta` : `Facebook`, `Instagram`, `WhatsApp`, `Threads`, `Oculus`, `Meta Quest`.
- Remapper vers `MetaAI` : `LLaMA`, `Llama`.

### 1.5 Liste des entités : Microsoft

- `Microsoft` est l'entité corporate de référence dans les listes de concurrents.
- Remapper vers `Microsoft` : `Azure`, `LinkedIn`, `GitHub`, `Skype`, `Bing`, `Nuance`, `Activision`, `Xbox`, `Microsoft Translator`, `Office 365`.

### 1.6 Liste des entités : Z.AI

- `Z.AI` est l'entité de référence pour `Zhipu AI`, `Zhipu`, `Z.ai`, `Z AI` et variantes orthographiques.

---

## 2. Table `investors` — Définitions et Champs

### 2.1 Champs spécifiques à `investors`

| Champ | Définition | Exemple |
|-------|-----------|---------|
| `investor_type` | Catégorie principale de l'investisseur (voir taxonomie §2.2) | `Venture Capital` |
| `ownership` | Entité mère qui détient l'investisseur. Vide = investisseur autonome | `Alphabet` pour GV |
| `participations` | Entreprises dans lesquelles l'investisseur détient une **participation minoritaire** | `OpenAI, Anthropic` |
| `acquisitions` | Entreprises dans lesquelles l'investisseur a pris le **contrôle majoritaire** | `Arm Holdings` |
| `capital_investi` | Capital déployé en USD millions | `5000` |

### 2.2 Taxonomie `investor_type`

**Fonds privés :**
- `Venture Capital` — fonds early/growth stage (Sequoia, a16z, General Catalyst)
- `Private Equity` — buyout, LBO (Silver Lake, EQT)
- `Growth Equity` — investissements croissance (Tiger Global, General Atlantic)
- `Hedge Fund` — fonds alternatifs (Millennium, Renaissance)
- `Fonds de fonds` — investit dans d'autres fonds

**Fonds institutionnels :**
- `Fonds de pension` — retraites (CalPERS, NPS Korea, Vanguard)
- `Fonds souverain` — état via SWF (GIC, Mubadala, Temasek, Khazanah)
- `Fonds public` — organisme d'état non-SWF (Bpifrance, British Business Bank, Bayern Kapital)
- `Fonds de dotation` — endowments universitaires

**Banques & Finance :**
- `Banque d'investissement` — Goldman Sachs, JPMorgan, Deutsche Bank
- `Gestionnaire d'actifs` — BlackRock, Fidelity, State Street, Vanguard
- `Banque de développement` — BDC Capital, MUFG, Mizuho

**Entreprises & Industriels :**
- `Holding / Conglomérat` — SoftBank Group, Berkshire Hathaway, Alphabet
- `Industriel stratégique` — Samsung, Nvidia, Toyota (investissent sans fonds dédié)
- `Corporate VC` — bras VC d'une entreprise (Intel Capital, GV, Salesforce Ventures)

**Structures légères :**
- `Family Office` — Bernard Arnault, Xavier Niel, Joseph Tsai
- `Investisseur individuel` — Jeff Bezos, Jensen Huang (angel)
- `Club d'investissement` — groupes d'angels

**Écosystème & Recherche :**
- `Accélérateur / Incubateur` — Y Combinator, Alchemist
- `Université / Recherche` — University of Amsterdam, UnternehmerTUM
- `Fondation` — fondations philanthropiques

### 2.3 Règle participation vs acquisition

- **Participation** (`participations`) : l'investisseur détient une part minoritaire sans contrôle opérationnel.
- **Acquisition** (`acquisitions`) : l'investisseur détient la majorité ou le contrôle effectif.
- En cas de doute, utiliser `participations`.

---

## 3. Enrichissement des données

### 3.1 Principe de qualité sources

En cas de doute sur une information, renseigner `NA` plutôt qu'une valeur hypothétique.

### 3.2 Score de priorité des sources

`priorite = 0.65 × F(fiabilité) + 0.35 × R(récence)`

**Fiabilité F :**
- `0.90–0.93` : site officiel, filings réglementaires
- `0.85–0.90` : Wikipedia, Wikidata vérifiée
- `0.78–0.84` : Crunchbase, bases de données marchés
- `0.65–0.77` : presse tech/business, recherche secondaire

**Récence R :**
- `1.00` : ≤ 3 mois / `0.95` : ≤ 6 mois / `0.90` : ≤ 12 mois
- `0.75` : ≤ 24 mois / `0.55` : ≤ 36 mois / `0.35` : > 36 mois

### 3.3 Langue et encodage

- Toutes les descriptions en **anglais**.
- Longueur minimale : **70 caractères**.
- Encodage : **UTF-8** obligatoire.

---

## 4. Règles de géographie

- Les valeurs de `country` doivent être en **anglais** (ex: `France`, `United States`, `South Korea`).
- Corriger `South Corea` → `South Korea`.
- Script de normalisation : `scripts/normalize_geo_english.js`.

---

## 5. Règles de secteurs (`enterprises`)

- Champ `sector` : maximum 5 labels, séparés par des virgules.
- Labels contrôlés via `scripts/normalize_sector_labels.js`.
- `Robotics` et `Automation` sont deux labels distincts. Ne pas classer automatiquement la robotique dans `Hardware`.
- `Aerospace`, `Defence` et `Public Sector` sont trois labels distincts. Ne pas les fusionner dans `Public Sector & Aerospace` ni dans `Aerospace & Defence`.
- Conserver `HealthTech`, `MedTech` et `Biotech` comme labels distincts. Réaffecter `Health & Social Care` et ses variantes à `HealthTech`.
- Toutes les variantes de secteur juridique (`Legal tech`, `LegalTech`, `LawTech`, `Legal Technology`) deviennent `LegalTech`.
- `Agentic` est un label distinct. Les autres variantes génériques d'IA (`Artificial Intelligence`, `AI`, `AI lab`, `Computer vision`, `Vision`, `Speech`) deviennent `AI model`.
- `HR` et `Recruiting` deviennent `HRM`.
- Les labels de type `Venture & ...`, `Venture and ...` et `Venture Capital &/and ...` deviennent `Venture Capital`.
- La politique de consolidation entre `Marketing`, `Sales`, `CRM` et `Advertising` reste à définir avant toute réaffectation.
- Les placeholders de secteur (`N/A`, `NA`, `N`, `A`) sont supprimés. Si une fiche ne contient aucun autre label, `sector` doit être `NULL`.

### 5.1 Ontologie sectorielle à trois niveaux

Le référentiel est structuré en trois granularités, décrites dans un seul fichier : `public/sector_ontology.csv`.

| Niveau | Colonne CSV | Cardinalité | Rôle |
|--------|-------------|-------------|------|
| **Label** | `canonical_label` | 56 | Étiquette fine, seule valeur autorisée dans `enterprises.sector` |
| **Groupe** | `group` | 6 | Niveau intermédiaire, hérité, conservé pour compatibilité |
| **Domaine** | `domain` | 12 | Niveau méta, sert au filtrage et à l'agrégation |

Le principe est de **conserver la finesse des étiquettes** tout en offrant une lecture agrégée : on n'appauvrit jamais `sector`, on ajoute une couche de lecture au-dessus.

Colonnes du CSV : `canonical_label`, `group`, `alias_terms`, `keyword_terms`, `description`, `domain`. Les alias et mots-clés multiples sont séparés par `|` ; ne pas utiliser de virgule dans une cellule. Toute modification manuelle du fichier est prise en compte par le normaliseur, par le sélecteur de secteurs et par le serveur, sans redémarrage.

### 5.2 Les 12 domaines

`Artificial Intelligence`, `Commercial Functions`, `Compute & Infrastructure`, `Consumer & Society`, `Data & Knowledge`, `Environment & Resources`, `Finance & Capital`, `Health & Life Sciences`, `Industry & Manufacturing`, `Mobility Space & Defence`, `Public Research & Trust`, `Software & Delivery`.

Un label appartient à exactement un domaine. Une entreprise portant plusieurs labels hérite donc de plusieurs domaines.

### 5.3 Champ dérivé `sector_domains`

La colonne `enterprises.sector_domains` stocke les domaines déduits de `sector`, séparés par des virgules et triés alphabétiquement.

- Ce champ est **dérivé, jamais saisi à la main**.
- Il est recalculé automatiquement par le serveur à chaque création et à chaque édition d'entreprise.
- Après un import en masse ou une modification du CSV, le régénérer avec `node scripts/backfill_sector_domains.js` (aperçu) puis `--apply`.
- Un label sans domaine déclaré ne produit aucune valeur : la fiche reste sans domaine plutôt que d'être rattachée arbitrairement.

L'interface expose un filtre `domain` (API : `/api/enterprises?domain=...`) et affiche le domaine en badge sur chaque fiche.

### 5.4 Normalisation des labels

Deux modes existent, à choisir selon l'intention :

- `node scripts/normalize_sector_labels.js --aliases-only` : fusionne uniquement les variantes déclarées dans `alias_terms`. **Mode conservateur à privilégier après un import** ; il ne touche à aucun label déjà canonique.
- `node scripts/normalize_sector_labels.js` : applique en plus la classification par `keyword_terms`, qui peut réaffecter des labels déjà canoniques. À réserver aux reprises volontaires.

Ajouter `--apply` pour écrire ; sans ce drapeau les deux modes sont en aperçu.

Inventaire des variantes et détection des doublons morphologiques : `node scripts/audit_sector_label_variants.js` (lecture seule).

Règle d'extension : pour réduire une variante, **ajouter un alias** dans le CSV plutôt que créer un label. Un alias ne doit apparaître que dans une seule ligne, sinon la dernière occurrence l'emporte silencieusement.

### 5.5 Liste des 56 labels canoniques

Lorsque `ICT` est accompagné d'au moins un autre label, supprimer `ICT` : les catégories plus spécifiques priment. Le conserver uniquement lorsqu'il est le seul label.

1. `Advertising`
2. `Aerospace`
3. `Agriculture & Forestry`
4. `AI model`
5. `Agentic`
6. `Automation`
7. `Biotech`
8. `Blockchain & Web3`
9. `Cloud Provider`
10. `Computer Vision`
11. `Construction`
12. `Customer Experience`
13. `Data`
14. `Defence`
15. `Developer Tools`
16. `Document AI`
17. `Drone & UAV`
18. `Education`
19. `Energy & ClimateTech`
20. `Financial Services`
21. `Gaming`
22. `Generative Media`
23. `Hardware`
24. `HealthTech`
25. `HRM`
26. `ICT`
27. `IT & Security`
28. `Industrial & Manufacturing`
29. `Inference & Model Serving`
30. `Infrastructure`
31. `LegalTech`
32. `Logistics & Supply Chain`
33. `Marketing`
34. `Media & Entertainment`
35. `MedTech`
36. `Mobility & Transport`
37. `Natural Language Processing`
38. `Operations`
39. `Professional Services`
40. `Public Sector`
41. `R&D`
42. `Real Estate & PropTech`
43. `Retail & E-commerce`
44. `Robotics`
45. `Sales`
46. `Semiconductors`
47. `Spatial Computing`
48. `Venture Capital`
49. `Voice & Audio AI`
50. `Workflow & Productivity`
51. `Digital Twins`
52. `Naval`
53. `RAG`
54. `Quantic`
55. `Sustainability`
56. `SaaS`

`SaaS` appartient au groupe `Business Model` et au domaine `Software & Delivery` : il qualifie le mode de distribution (abonnement logiciel) et non un secteur d'activité. Ce groupe est destiné à accueillir d'autres modèles (licence, services managés, place de marché) lorsqu'ils seront nécessaires.

---

## 6. Import d'une liste externe

Protocole appliqué à toute nouvelle liste (CB Insights, Forbes AI 50, annuaires nationaux). Voir le skill `database-completion` pour le détail.

1. **Comparer** les noms normalisés à la base avant toute écriture ; consigner les décisions `created`, `existing`, `ambiguous`.
2. **Rechercher** les faits sur le web, source par source, et conserver `sources` et `confidence_notes` dans un fichier de travail sous `exports/research/`.
3. **Créer** les fiches absentes avec `is_validated = 3` et les seuls champs confirmés ; laisser `NULL` le reste.
4. **Appliquer** l'enrichissement dans une transaction, avec sauvegarde préalable de `database.db` dans `database_backups/`.
5. **Contrôler** encodage, complétude, taxonomie sectorielle et géographie, puis normaliser avec `--aliases-only`.

### 6.1 Traçabilité des imports

Chaque fiche importée porte dans sa `description` une ligne de provenance finale mentionnant la source et la catégorie d'origine. Cette ligne sert de marqueur de filtrage : combinée au segment `is_validated = 3`, elle permet d'isoler exactement le lot importé pour la revue manuelle.

### 6.2 Structure des descriptions

Une description d'entreprise suit trois paragraphes, dans cet ordre :

1. **Histoire** : fondation, fondateurs, étapes de financement, faits marquants datés.
2. **Proposition de valeur** : produit, technologie, problème adressé.
3. **Modèle économique** : mode de facturation, clients, canaux de distribution.

En anglais, minimum 70 caractères, uniquement des faits vérifiés sur une page consultée.

---

## 7. Règles de validation (`is_validated`)

| Valeur | Signification |
|--------|--------------|
| `0` | Non validé (pending) |
| `1` | Partiellement validé |
| `2` | Validé |
| `3` | À revoir plus tard (review later) |

Toute fiche créée automatiquement reçoit `3` tant qu'une vérification humaine ne l'a pas confirmée.

---

## 8. Prochaines sections à documenter

- Règles de temporalité (dates d'acquisition, `end_year`)
- Règles de relations et de partenariats
- Règles de déduplication inter-tables
- Extension du groupe `Business Model` au-delà de `SaaS`
