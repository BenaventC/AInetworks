# Analyses Statistiques - Réseaux d'Acteurs IA

Ce dossier contient le notebook d'analyse principal et ses exports.

## Structure

```text
analyses/
├── sector_positioning_ca.ipynb
├── statistiques_entreprises.ipynb
├── exports/
│   └── images/
└── README.md
```

## Pré requis

- environnement Python avec:

```bash
pip install pandas numpy matplotlib seaborn plotly umap-learn requests jupyter
```

## Notebook principal

Le notebook `statistiques_entreprises.ipynb` est structuré en 8 sections.
Chaque section suit un format lisible: introduction, résultats (table/graphique), début d'analyse.

Points clés actuels:

- chargement direct des entreprises depuis `database.db`
- conversion de `capitalization` vers `capitalization_millions`
- section méthodologique en amont avec schéma Mermaid
- analyse sectorielle par label normalisé: les fiches multi-labels sont comptées pour chaque label, le tableau complet et l'export sont alphabétiques, et `Aerospace`, `Defence` et `Public Sector` sont distincts

## Exports générés

Les images générées sont stockées dans `analyses/exports/images/`, quel que soit leur format.

Le notebook génère:

- `analyses/exports/statistiques_par_pays.csv`
- `analyses/exports/statistiques_par_secteur.csv`
- `analyses/exports/donnees_completes.csv`

## Carte sectorielle UMAP

Le notebook `sector_positioning_ca.ipynb` construit une projection UMAP de profils
entreprises × labels sectoriels pondérés en TF-IDF pour les entreprises dont
`capitalization > 100` (USD millions). Les entreprises sont projetées avec la
distance cosinus; les secteurs sont positionnés à leur barycentre TF-IDF dans le
même espace. Les labels entreprises sont dimensionnés selon leur capitalisation;
les points secteurs sont dimensionnés selon leur fréquence dans la population analysée.

Exports:

- `analyses/exports/sector_umap_company_coordinates.csv`
- `analyses/exports/sector_umap_sector_coordinates.csv`
- `analyses/exports/sector_umap_summary.csv`
- `analyses/exports/sector_positioning_umap.html`
- `analyses/exports/images/sector_positioning_umap.png`

Exécution:

```bash
jupyter nbconvert --to notebook --execute analyses/sector_positioning_ca.ipynb --output sector_positioning_ca_output.ipynb
```

## Exécution

Depuis VS Code: ouvrir le notebook et exécuter toutes les cellules.

Depuis la ligne de commande:

```bash
jupyter nbconvert --to notebook --execute statistiques_entreprises.ipynb --output output.ipynb
```

## Dépannage rapide

1. Vérifier que `database.db` existe à la racine du projet.
2. Vérifier que les dépendances Python sont installées dans l'environnement actif.
3. Redémarrer le kernel si les cellules échouent.

Dernière mise à jour: 22/07/2026

