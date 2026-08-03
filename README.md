# AI Networks

Ce dépôt rassemble un projet d’exploration des acteurs de l’IA, leurs partenariats, leurs secteurs, ainsi que des analyses et exports associés.

## Objectif

L’objectif est de fournir une base de travail ouverte pour :

- cartographier les entreprises et organisations de l’IA,
- documenter leurs partenariats et relations,
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

## Disclaimer

Ce projet est une compilation de recherche et de données issues de sources variées. Les informations peuvent être incomplètes, obsolètes, partielles ou sujettes à erreur.

Aucune garantie n’est donnée sur l’exhaustivité, la précision ou la validité des données. En cas de doute, il est recommandé de vérifier les informations auprès de sources primaires avant toute utilisation dans un contexte professionnel, académique ou commercial.

Lorsqu’une information est incertaine, le projet privilégie l’usage de `NA` plutôt qu’une hypothèse non vérifiée.

## Licence

Le contenu de ce dépôt, y compris les données, exports, analyses et documents, est publié sous licence Creative Commons Attribution 4.0 International (CC BY 4.0).

Vous êtes autorisé à partager et adapter le contenu à condition de mentionner l’origine, de citer le dépôt BenaventC/AInetworks et d’indiquer les modifications apportées.

## Remerciements

Merci à toutes les personnes et sources ayant contribué à la collecte, à la normalisation et à l’enrichissement de ces données.

