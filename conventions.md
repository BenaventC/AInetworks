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
- **`investors`** : entités dont l'activité principale est de déployer du capital (VC, PE, fonds souverains, banques, etc.).

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
- La politique de consolidation entre `Marketing`, `Sales`, `CRM` et `Advertising` reste à définir avant toute réaffectation.
- Les placeholders de secteur (`N/A`, `NA`, `N`, `A`) sont supprimés. Si une fiche ne contient aucun autre label, `sector` doit être `NULL`.

### 5.1 Référentiel cible à valider

Le projet vise un référentiel fermé de 50 labels pertinents, en anglais, présenté dans l'ordre alphabétique. Cette liste est une proposition de travail : ne pas l'appliquer aux fiches avant validation des regroupements restants.

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
48. `Sustainability`
49. `Voice & Audio AI`
50. `Workflow & Productivity`

---

## 6. Règles de validation (`is_validated`)

| Valeur | Signification |
|--------|--------------|
| `0` | Non validé (pending) |
| `1` | Partiellement validé |
| `2` | Validé |
| `3` | À revoir plus tard (review later) |

---

## 7. Prochaines sections à documenter

- Règles de temporalité (dates d'acquisition, end_year)
- Règles de relations/partenariats
- Règles de déduplication inter-tables


### 1.1 Principe général

- Les listes de concurrents doivent contenir des entités opérationnelles comparables.
- On privilégie les entités qui agissent réellement sur un marché (produits, plateformes, business units, filiales opérantes).
- Les holdings et structures d'investissement ne doivent pas être mélangées avec les entités opérationnelles dans les listes de concurrents.

### 1.3 Règle d'application pour les listes de concurrents

- `Alphabet` est traité comme investisseur (holding) et non comme entité concurrente opérationnelle de premier niveau.
- Les entités à utiliser dans les listes de concurrents sont:
  - `Google` (incluant `Google Search`, `YouTube`, `Chrome`, `Translate`, `Assistant`)
  - `Google Cloud` (incluant `TPU`,)
  - `Waymo`
  - `DeepMind` (Incluant `Antigravity`)

### 1.3 Règle d'application pour les listes de concurrents

- Si une source mentionne `Alphabet` comme concurrent, remapper vers l'entité opérationnelle pertinente parmi:
  - `Google`
  - `Google Cloud`
  - `Waymo`
  - `DeepMind`
- En cas d'ambiguïté, utiliser `Google` par défaut.
- Les variantes de nommage (ex: `Youtube`, `YouTube`, `Google Search`) doivent être normalisées selon cette convention.

### 1.4 Liste des entités: Meta

- `Meta` est l'entité corporate de référence dans les listes de concurrents.
- Les actifs/produits suivants sont inclus dans `Meta` et doivent être remappés vers `Meta`:
  - `Facebook`
  - `Instagram`
  - `WhatsApp` (et variante `Whatsapp`)
  - `Threads`
  - `Oculus`
  - `Meta Quest`
- Les actifs/produits suivants sont inclus dans `MetaAI` et doivent être remappés vers `MetaAI`:
  - `LLaMA`
  - `Llama`

Règle d'application:

- Si une source cite un de ces noms, normaliser vers `Meta`.
- En cas d'ambiguïté entre produit et entité, garder `Meta` comme valeur canonique.

### 1.5 Liste des entités: Microsoft

- `Microsoft` est l'entité corporate de référence dans les listes de concurrents.
- Les actifs/produits/filiales suivants sont inclus dans `Microsoft` et doivent être remappés vers `Microsoft`:
  - `Azure` / `Microsoft Azure`
  - `LinkedIn` (et variante `Linkedin`)
  - `GitHub` (et variante `Github`)
  - `Skype`
  - `Bing`
  - `Nuance` / `Nuance Communications`
  - `Activision` / `Activision Blizzard`
  - `Xbox`
  - `Microsoft Translator`
  - `Office 365`

Règle d'application:

- Si une source cite un de ces noms, normaliser vers `Microsoft`.
- En cas d'ambiguïté entre marque produit et groupe, garder `Microsoft` comme valeur canonique.

### 1.6 Liste des entités: Z.AI

- `Z.AI` est l'entité de référence pour les mentions liées à Zhipu AI, Zhipu, Z.ai, et leurs variantes orthographiques.
- Toute occurrence de `Zhipu AI` ou de ses variantes dans les champs de concurrents doit être normalisée vers `Z.AI`.
- Cette règle s'applique également aux variantes telles que `Zhipu`, `Z.ai`, `Z AI`, ou toute autre forme similaire lorsque le contexte correspond à la même entreprise.

Règle d'application:

- Si une source cite `Zhipu AI` ou une variante proche, normaliser vers `Z.AI`.
- En cas d'ambiguïté, conserver `Z.AI` comme valeur canonique si l'entité correspond bien à la société chinoise de modèles de langage.

---

Prochaines sections à ajouter au fur et à mesure:

- Règles de géographie (pays, villes, régions)
- Règles de secteurs
- Règles investisseurs / partenaires / acquisitions
- Règles de temporalité et récence
- Règles de qualité des sources
