# Data Sources and Research Protocol

This file records the source families used to enrich the local database. Volatile values such as market capitalization, funding, revenue, and headcount must be checked against a recent primary or high-trust source before publication.

## Source Families

### Company discovery and market context

- [Failory - AI Unicorns](https://www.failory.com/startups/artificial-intelligence-unicorns)
- [CB Insights - AI Unicorns](https://www.cbinsights.com/research-unicorn-companies)
- [Forbes AI 50](https://www.forbes.com/ai/)
- [Sifted AI 100](https://sifted.eu/)
- [AI Startups Europe](https://www.aistartupseurope.com/)
- [cbinsights](https://www.cbinsights.com/research/report/artificial-intelligence-top-startups-2026/)

### Structured and encyclopedic references

- [Wikipedia](https://www.wikipedia.org/)
- [Wikidata](https://www.wikidata.org/)

### Market capitalization and financial values

- [CompaniesMarketCap](https://companiesmarketcap.com/)
- Company investor-relations pages, annual reports, regulatory filings, and official press releases.
- Reputable business and technology press for dated funding rounds or tender offers when primary material is unavailable.

### News and contextual verification

- [TechCrunch](https://techcrunch.com/)
- [Crunchbase News](https://news.crunchbase.com/)

## Source Selection Rules

1. Prefer primary filings, investor relations, annual reports, and official announcements.
2. Use structured references such as Wikidata and CompaniesMarketCap as high-trust secondary sources.
3. For volatile fields, prefer the most recent source among sources with comparable reliability.
4. When values conflict, document the selected source, fact date, reliability, recency, and reason for the decision.
5. When three to four close, coherent values are available for an uncertain estimate, use their arithmetic mean and record the underlying values.
6. If no reliable value or coherent range is available, use `NA` in working files or `NULL` in SQLite rather than inventing a value.

## Research Template

For each reviewed entity, record:

- canonical name and entity type (`enterprise` or `investor`),
- history and value proposition,
- economic model
- founding date and headquarters,
- market capitalization, profit
- funds raised or capital invested,
- revenue and headcount, CAPEX, R&D
- investors and participations,
- acquisitions and competitors,
- source URLs, fact dates, and arbitration notes.
