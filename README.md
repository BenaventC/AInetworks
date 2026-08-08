# AI Networks

<p align="center">
  <a href="analyses/exports/competition_map_2d_voronoi.html">
    <img src="analyses/exports/competition_map_2d_voronoi.png?v=20260808" alt="AI competition map (Voronoi)" width="100%" />
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

### Local Usage

1. Open http://localhost:3000 in your browser.
2. Explore the local project interface.
3. Press Ctrl+C in the terminal to stop the server.

## Project Structure

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

The `analyses/` folder contains the main notebooks used to explore the database from different perspectives.

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

Missing fields were enriched with GitHub Copilot-assisted research:
- structured extraction from Wikipedia and Wikidata,
- targeted queries on public sources,
- mapping of market capitalization and funding amounts,
- metadata completion (founded year, sector, description).

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

