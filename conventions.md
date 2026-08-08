# Conventions

Ce document centralise les conventions du projet.
Il est conçu pour être enrichi progressivement, par domaine.

## 1. Définition des entités

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

---

Prochaines sections à ajouter au fur et à mesure:

- Règles de géographie (pays, villes, régions)
- Règles de secteurs
- Règles investisseurs / partenaires / acquisitions
- Règles de temporalité et récence
- Règles de qualité des sources
