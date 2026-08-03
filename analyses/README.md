# Analyses Statistiques - Réseaux d'Acteurs IA

Ce dossier contient le notebook d'analyse principal et ses exports.

## Structure

```text
analyses/
├── statistiques_entreprises.ipynb
├── exports/
└── README.md
```

## Pré requis

- serveur Node lancé sur `http://localhost:3000`
- environnement Python avec:

```bash
pip install pandas numpy matplotlib seaborn requests jupyter
```

## Notebook principal

Le notebook `statistiques_entreprises.ipynb` est structuré en 8 sections.
Chaque section suit un format lisible: introduction, résultats (table/graphique), début d'analyse.

Points clés actuels:

- chargement des entreprises via API paginée (segments `pending` et `validated`)
- conversion de `capitalization` vers `capitalization_millions`
- section méthodologique en amont avec schéma Mermaid
- analyse secteur sur le top 20

## Exports générés

Le notebook génère:

- `analyses/exports/statistiques_par_pays.csv`
- `analyses/exports/statistiques_par_secteur.csv`
- `analyses/exports/donnees_completes.csv`

## Exécution

Depuis VS Code: ouvrir le notebook et exécuter toutes les cellules.

Depuis la ligne de commande:

```bash
jupyter nbconvert --to notebook --execute statistiques_entreprises.ipynb --output output.ipynb
```

## Dépannage rapide

1. Vérifier que `npm start` est actif.
2. Tester `http://localhost:3000/api/enterprises`.
3. Redémarrer le kernel si les cellules échouent.

Dernière mise à jour: 22/07/2026

