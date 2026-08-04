# AI Networks

Ce dépôt rassemble un projet d’exploration des acteurs de l’IA, leurs partenariats, leurs secteurs, ainsi que des analyses et exports associés.

## Objectif

L’objectif est de fournir une base de travail ouverte pour :

- cartographier les entreprises et organisations de l’IA,
- documenter leurs positions concurrrentielles, leurs réseaux de partenariats et relations financières.
- produire des analyses locales et des exports structurés,
- permettre une exploration simple via une interface web locale.

## Contenu du dépôt

- application web locale : serveur Express + interface web,
- données et exports : entreprises, partenariats, analyses,
- scripts de nettoyage, normalisation et enrichissement,
- notebooks d’analyse.

## Démarrage rapide

Prérequis :

- Node.js 18+
- npm

### Installation locale

```bash
git clone https://github.com/BenaventC/AInetworks.git
cd AInetworks
npm install
```

### Lancement local

```bash
npm start
```

L’application est ensuite accessible sur http://localhost:3000.

### Utilisation locale

1. Ouvrez votre navigateur à l’adresse http://localhost:3000.
2. La page affiche l’interface locale du projet.
3. Si vous souhaitez arrêter le serveur, appuyez sur Ctrl+C dans le terminal.

## Structure du projet

```text
.
├── server.js
├── public/
├── analyses/
├── scripts/
├── archives/
└── exports/
```

## Analyses

Le dossier `analyses/` contient les notebooks principaux pour explorer la base sous différents angles.

### 1. Analyse concurrentielle

Notebook : `analyses/competition_analysis.ipynb`

Objectif : cartographier les relations entreprise-concurrent et projeter l'espace concurrentiel en 2D.

Sorties principales (dans `analyses/exports/`) :
- `competitors_raw.csv`
- `competitors_long.csv`
- `competitors_aggregated.csv`
- `cooccurrence_matrix.csv`
- `coords_2d.csv`
- `competition_map_2d.html`

### 2. Analyse de similarité sémantique

Notebook : `analyses/semantic_similarity_analysis.ipynb`

Objectif : mesurer la proximité sémantique entre entreprises à partir des descriptions textuelles, avec embeddings multilingues.

Filtre principal : entreprises avec valorisation/fonds > 100 et description non vide.

Sorties principales (dans `analyses/exports/`) :
- `semantic_raw.csv`
- `semantic_distance_matrix.csv`
- `semantic_coords_2d.csv`
- `semantic_similarity_pairs.csv`
- `semantic_similarity_map_2d.html`

### 3. Alignement Procruste des deux espaces

Notebook : `analyses/procrustes_alignment_analysis.ipynb`

Objectif : aligner l'espace concurrentiel et l'espace sémantique sur l'intersection des entreprises communes, puis mesurer les écarts résiduels par entreprise.

Sorties principales (dans `analyses/exports/`) :
- `procrustes_aligned_positions.csv`
- `procrustes_top_gaps.csv`
- `procrustes_summary.csv`
- `procrustes_robust_comparison.csv`

### Ordre recommandé d'exécution

1. `competition_analysis.ipynb`
2. `semantic_similarity_analysis.ipynb`
3. `procrustes_alignment_analysis.ipynb`

Cet ordre garantit la présence des fichiers exportés nécessaires aux analyses croisées.

## Méthodologie de constitution du corpus

La base de données a été constituée selon un processus itératif en six étapes :

### 1. Compilation de sources multiples

Le corpus initial provient de la fusion de plusieurs listes d'entreprises de l'IA :
- **Listes internationales** : Forbes AI 50, CB Insights AI 100, Crunchbase AI startups
- **Listes nationales et régionales** : AI Startups Europe, Sifted AI 100, listes par pays
- **Licornes et entreprises à forte capitalisation** : CompaniesMarketCap, données boursières
- **Sources Wikipedia** : catégories d'entreprises d'IA, pages thématiques

### 2. Nettoyage et déduplication

Les listes compilées ont été nettoyées par des scripts automatisés :
- Déduplication des noms d'entreprises (variantes orthographiques, casse, diacritiques)
- Normalisation des champs géographiques (pays, villes) vers des formes canoniques
- Harmonisation des noms de partenaires, concurrents et investisseurs
- Suppression des doublons et consolidation des enregistrements

### 3. Enrichissement automatisé

Les champs manquants ont été complétés via GitHub Copilot et ses outils de recherche :
- Extraction de données structurées depuis Wikipedia, Wikidata
- Requêtes ciblées sur des sources publiques (sites officiels, bases de données ouvertes)
- Mapping automatique de la capitalisation boursière et des montants de levée de fonds
- Remplissage des métadonnées (année de création, secteur, description)

### 4. Correction manuelle systématique

Chaque fiche a été révisée manuellement avec l'assistance d'outils IA :
- Utilisation de Google AI Search pour valider et corriger les informations
- Application d'un prompt systématique reprenant tous les champs de la base
- Vérification incidente des incohérences et des données aberrantes
- Préférence pour `NA` en cas de doute plutôt que des valeurs hypothétiques

### 5. Révisions itératives des acteurs majeurs

Les 200 premières entreprises (par capitalisation ou montant cumulé de levées de fonds) ont bénéficié de révisions approfondies :
- Plusieurs passages de vérification et d'enrichissement
- Mise à jour continue au fil des informations collectées
- Validation croisée des partenariats et relations concurrentielles
- Documentation des sources et arbitrage en cas de divergences

### 6. Maintenance collaborative future

La base est conçue pour évoluer avec des contributions ciblées :
- Mise à jour manuelle par segments : pays, marchés, technologies
- Contributions étudiantes et académiques sur des périmètres définis
- Processus de révision et validation des modifications
- Documentation des changements et traçabilité des sources

## Disclaimer

Ce projet est une compilation de recherche et de données issues de sources variées. Les informations peuvent être incomplètes, obsolètes, partielles ou sujettes à erreur.

Aucune garantie n’est donnée sur l’exhaustivité, la précision ou la validité des données. En cas de doute, il est recommandé de vérifier les informations auprès de sources primaires avant toute utilisation dans un contexte professionnel, académique ou commercial.

Lorsqu’une information est incertaine, le projet privilégie l’usage de `NA` plutôt qu’une hypothèse non vérifiée.

## Licence

Le contenu de ce dépôt, y compris les données, exports, analyses et documents, est publié sous licence Creative Commons Attribution 4.0 International (CC BY 4.0).

Vous êtes autorisé à partager et adapter le contenu à condition de mentionner l’origine, de citer le dépôt BenaventC/AInetworks et d’indiquer les modifications apportées.

## Remerciements

Merci à toutes les personnes et sources ayant contribué à la collecte, à la normalisation et à l’enrichissement de ces données.

