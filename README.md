# AI Networks

<p align="center">
  <a href="analyses/exports/competition_map_2d_voronoi.html">
    <img src="analyses/exports/images/competition_map_2d_voronoi.png?v=20260808" alt="AI competition map (Voronoi)" width="100%" />
  </a>
</p>

<p align="center"><em>2D competition map of AI actors with Voronoi community regions (click to open the interactive version).</em></p>

This repository contains an AI actor exploration project, including company relationships, partnerships, sectors, and analysis exports.

## Goal

Provide an open working base to:

- map AI companies and organizations,
- document competitive positions, partnership networks, and financial signals,
- produce local analyses and structured exports,
- enable simple exploration through a local web interface.

## Repository Content

- local web application: Express server and web UI,
- data and exports: companies, partnerships, analysis outputs,
- scripts for cleaning, normalization, and enrichment,
- analysis notebooks.

## Quick Start

Requirements:

- Node.js 18+
- npm
- the project database `database.db` at the repository root

### Local Installation

```bash
git clone https://github.com/BenaventC/AInetworks.git
cd AInetworks
npm install
```

### Run Locally

```bash
npm start
```

The app is available at http://localhost:3000.

The application expects `database.db` to be present at the repository root. The server applies compatible schema migrations at startup; keep a backup before applying substantial database changes.

### Local Usage

1. Open http://localhost:3000 in your browser.
2. Explore the local project interface.
3. Press Ctrl+C in the terminal to stop the server.

## Project Structure

```text
.
├── server.js
├── public/
│   ├── index.html          # main UI (enterprises, investors, relationships)
│   ├── data-explorer.html  # ranked exploration page (all entities by valuation)
│   ├── app.js
│   └── styles.css
├── analyses/
├── scripts/
├── archives/
└── exports/
```

## Analyses

The [`analyses/`](analyses/) folder contains the notebooks used to explore the database from different perspectives. The reusable preparation and normalization scripts are grouped in [`scripts/`](scripts/).

### Analysis Notebooks

- [`competition_analysis.ipynb`](analyses/competition_analysis.ipynb): competition network, 2D positioning, communities, and map exports.
- [`semantic_similarity_analysis.ipynb`](analyses/semantic_similarity_analysis.ipynb): semantic proximity from enterprise descriptions.
- [`procrustes_alignment_analysis.ipynb`](analyses/procrustes_alignment_analysis.ipynb): alignment of competition and semantic spaces.
- [`sector_positioning_ca.ipynb`](analyses/sector_positioning_ca.ipynb): sector positioning with correspondence analysis and UMAP.
- [`statistiques_entreprises.ipynb`](analyses/statistiques_entreprises.ipynb): database coverage, quality, country, and sector statistics.
- [`evolution_capitalisation_meta_google_nvidia.ipynb`](analyses/evolution_capitalisation_meta_google_nvidia.ipynb): capitalization evolution of major technology companies.
- [`value_concentration.ipynb`](analyses/value_concentration.ipynb): cumulative capitalization concentration among the Top 200 enterprises.

Notebook conventions and execution notes are documented in [`analyses/README.md`](analyses/README.md). Generated images are stored in [`analyses/exports/images/`](analyses/exports/images/), while tabular and interactive HTML exports remain in [`analyses/exports/`](analyses/exports/).

### Analysis and Data Scripts

The [`scripts/`](scripts/) directory contains reusable data preparation tools, including:

- [`normalize_geo_english.js`](scripts/normalize_geo_english.js), [`normalize_sector_labels.js`](scripts/normalize_sector_labels.js), and [`normalize_partnership_types_english.js`](scripts/normalize_partnership_types_english.js): controlled-label normalization.
- [`audit_sector_label_variants.js`](scripts/audit_sector_label_variants.js) and [`backfill_sector_domains.js`](scripts/backfill_sector_domains.js): sector ontology audit and derivation of the domain level.
- [`normalize_all_entity_lists.js`](scripts/normalize_all_entity_lists.js) and [`normalize_competitor_names.js`](scripts/normalize_competitor_names.js): entity and competitor-name normalization.
- [`generate_relations_from_enterprises.py`](scripts/generate_relations_from_enterprises.py) and [`cleanup_generated_relation_targets.py`](scripts/cleanup_generated_relation_targets.py): relation generation and cleanup.
- [`enrich_relations_from_enterprises.js`](scripts/enrich_relations_from_enterprises.js) and [`enrich_top500_websites_logos.js`](scripts/enrich_top500_websites_logos.js): targeted enrichment utilities.
- [`migrate_enterprises_investor_type_to_investors.js`](scripts/migrate_enterprises_investor_type_to_investors.js): reusable enterprise-to-investor migration with dry-run support.

Scripts that modify data should be reviewed in dry-run or preview mode first, and their outputs should preserve the project conventions described in [`conventions.md`](conventions.md).

### 1. Competition Analysis

Notebook: `analyses/competition_analysis.ipynb`

Goal: map company-competitor relationships and produce a fully 2D final community map.

Current pipeline (simple view):
- clean and normalize competitor names,
- build a directed matrix (`company -> competitor`),
- apply sample selection rules (exclude investor profiles and isolated companies),
- project actors with 2D t-SNE,
- detect Louvain communities on a 2D k-NN graph,
- render multicolor blob communities with thematic labels (no company names in community labels).

Main outputs in `analyses/exports/`:
- `competitors_raw.csv`
- `competitors_long.csv`
- `competitors_aggregated.csv`
- `cooccurrence_matrix.csv`
- `coords_2d.csv`
- `communities_kmeans_2d.csv`
- `community_labels_short.csv`
- `selection_audit_summary.csv`
- `selection_audit_details.csv`
- `competition_map_2d_kmeans.html`

### 2. Semantic Similarity Analysis

Notebook: `analyses/semantic_similarity_analysis.ipynb`

Goal: measure semantic proximity between companies from textual descriptions using multilingual embeddings.

Main filter: companies with valuation/funding > 100 and a non-empty description.

Main outputs in `analyses/exports/`:
- `semantic_raw.csv`
- `semantic_distance_matrix.csv`
- `semantic_coords_2d.csv`
- `semantic_similarity_pairs.csv`
- `semantic_similarity_map_2d.html`

### 3. Procrustes Alignment of Both Spaces

Notebook: `analyses/procrustes_alignment_analysis.ipynb`

Goal: align competition and semantic spaces on common companies, then measure residual gaps per company.

Main outputs in `analyses/exports/`:
- `procrustes_aligned_positions.csv`
- `procrustes_top_gaps.csv`
- `procrustes_summary.csv`
- `procrustes_robust_comparison.csv`

### Recommended Execution Order

1. `competition_analysis.ipynb`
2. `semantic_similarity_analysis.ipynb`
3. `procrustes_alignment_analysis.ipynb`

This order ensures all required exports are available for cross-analysis.

## Dataset Construction Methodology

The database was built through an iterative six-step process.

### 1. Multi-source Compilation

Initial data was assembled by merging multiple AI company lists:
- international lists: Forbes AI 50, CB Insights AI 100, Crunchbase AI startups,
- regional lists: AI Startups Europe, Sifted AI 100, country-level lists,
- unicorn and high-capitalization sources: CompaniesMarketCap and market data,
- Wikipedia sources: AI company categories and thematic pages.

### 2. Cleaning and Deduplication

Compiled lists were cleaned with automated scripts:
- company-name deduplication (spelling variants, case, diacritics),
- normalization of geographic fields (countries, cities),
- harmonization of partner, competitor, and investor names,
- duplicate removal and record consolidation.

### 3. Automated Enrichment

Missing fields were enriched with GitHub Copilot-assisted research, in two separate phases:

- **research**: web sources are read company by company and written to JSON working files under `exports/research/`, each record keeping its `sources` and `confidence_notes`; any field not confirmed by a consulted page stays `null`,
- **application**: a distinct script writes to the database in a single transaction, filling only missing values and never overwriting an existing one without a more reliable and more recent source.

This separation makes research replayable and auditable, and keeps every arbitration traceable for manual review.

### 4. Systematic Manual Review

Each profile was manually reviewed with AI-assisted tools:
- additional verification and correction of key fields,
- consistency checks and anomaly detection,
- preference for `NA` when uncertainty remains.

### 5. Iterative Review of Major Actors

Top companies (by capitalization or cumulative funding) received deeper iterative review:
- repeated verification and enrichment passes,
- continuous updates based on new information,
- cross-checking of partnerships and competition relationships,
- documented source arbitration when data conflicts appeared.

### 6. Future Collaborative Maintenance

The dataset is designed to evolve through focused contributions:
- manual updates by country, market, or technology segment,
- student and academic contributions on scoped subsets,
- review and validation process for updates,
- source traceability and change documentation.

## Disclaimer

At this stage, the data is not yet complete or fully validated; this is an ongoing process focused on the 200 companies with the highest market capitalization and fundraising levels.

This project compiles research data from multiple sources. Information may be incomplete, outdated, partial, or inaccurate.

No guarantee is provided regarding completeness, precision, or validity. For professional, academic, or commercial use, verify critical information against primary sources.

When information is uncertain, the project prefers `NA` over unverified assumptions.

## License

All repository content, including data, exports, analyses, and documents, is released under Creative Commons Attribution 4.0 International (CC BY 4.0).

You may share and adapt the content with proper attribution, including a reference to `BenaventC/AInetworks` and indication of changes.

## Acknowledgments

Thanks to all contributors and public sources that supported data collection, normalization, and enrichment.

## Sector Ontology

Sectors are described at three levels of granularity, all defined in a single editable file, [`public/sector_ontology.csv`](public/sector_ontology.csv).

| Level | Column | Count | Purpose |
|-------|--------|-------|---------|
| Label | `canonical_label` | 56 | The only values allowed in `enterprises.sector` (max 5 per company) |
| Group | `group` | 6 | Inherited intermediate level |
| Domain | `domain` | 12 | Meta level used for filtering and aggregation |

The design goal is to **keep fine-grained labels while offering a coarse reading**. Rather than merging labels to simplify a chart, aggregate at the domain level.

`enterprises.sector_domains` is a derived field, never entered by hand: the server recomputes it on every create and update, and [`scripts/backfill_sector_domains.js`](scripts/backfill_sector_domains.js) regenerates it after bulk imports or ontology edits.

To reduce a label variant, add an alias in `alias_terms` instead of creating a new label, then run:

```bash
node scripts/audit_sector_label_variants.js                       # read-only inventory
node scripts/normalize_sector_labels.js --aliases-only            # preview, conservative
node scripts/normalize_sector_labels.js --aliases-only --apply    # write
```

The `--aliases-only` mode merges declared aliases only and leaves canonical labels untouched. Without the flag, keyword classification also applies and may reassign already-canonical labels.

## Latest Updates

- **Three-level sector ontology (Aug 2026)**: added the `domain` meta level (12 domains) and the derived `sector_domains` column. Sector label variants were reduced from 129 to 67 through alias merging, with no loss of granularity. The UI adds a domain filter and a domain badge on each card.
- **CB Insights AI 100 2026 import**: 81 new companies researched from public sources and added with three-paragraph descriptions (history, value proposition, business model). Raw research including sources and confidence notes is kept in `exports/research/`.
- **Data Explorer page** (`/data-explorer.html`): unified ranked list of enterprises and investors sorted by capitalization → funds raised → revenue, with country-coded names and hover tooltips.
- **Investor table**: dedicated `investors` table with `capital_investi`, `participations`, `acquisitions`, and `investor_type`.
- **Financial normalization**: all monetary fields are numeric, in USD millions.
- **Descriptions**: systematic enrichment covering ~2 600 enterprises and ~160 investors; coverage exceeds 74% for country and ~90% for descriptions.

