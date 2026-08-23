/**
 * Single reader for public/sector_ontology.csv, the source of the three-level
 * sector ontology: canonical_label (fine) / group (intermediate) / domain (meta).
 *
 * Previous copies split rows on ',' without a field limit, which would silently
 * corrupt the ontology as soon as a description contained a comma. This parser
 * handles quoted fields and validates the header.
 */

const fs = require('fs');
const path = require('path');
const { ROOT } = require('./db');

const ONTOLOGY_PATH = path.join(ROOT, 'public', 'sector_ontology.csv');
const COLUMNS = ['canonical_label', 'group', 'alias_terms', 'keyword_terms', 'description', 'domain'];

/** Minimal RFC 4180 row parser: handles quoted fields and doubled quotes. */
function parseRow(line) {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { cells.push(cell); cell = ''; }
    else cell += char;
  }
  cells.push(cell);
  return cells.map((value) => value.trim());
}

const pipeList = (value) => String(value || '').split('|').map((item) => item.trim()).filter(Boolean);

function loadOntology() {
  const [header, ...rows] = fs.readFileSync(ONTOLOGY_PATH, 'utf8').trim().split(/\r?\n/);
  if (parseRow(header).join(',') !== COLUMNS.join(',')) {
    throw new Error(`Unexpected header in ${ONTOLOGY_PATH}. Expected: ${COLUMNS.join(',')}`);
  }

  const entries = rows.filter(Boolean).map((row) => {
    const [canonicalLabel, group, aliasTerms, keywordTerms, description, domain] = parseRow(row);
    return {
      canonicalLabel,
      group,
      domain,
      description,
      aliases: pipeList(aliasTerms),
      keywords: pipeList(keywordTerms).map((keyword) => keyword.toLowerCase()),
    };
  });

  const canonical = new Set(entries.map((entry) => entry.canonicalLabel));
  const aliasToCanonical = new Map();
  const labelToDomain = new Map();
  for (const entry of entries) {
    labelToDomain.set(entry.canonicalLabel.toLowerCase(), entry.domain);
    for (const alias of [entry.canonicalLabel, ...entry.aliases]) {
      const key = alias.toLowerCase();
      const previous = aliasToCanonical.get(key);
      if (previous && previous !== entry.canonicalLabel) {
        console.warn(`Ontologie: l'alias "${alias}" est declare pour "${previous}" et "${entry.canonicalLabel}".`);
      }
      aliasToCanonical.set(key, entry.canonicalLabel);
    }
  }

  return { entries, canonical, aliasToCanonical, labelToDomain };
}

/** Derives the sorted domain list of a comma-separated `sector` value. */
function domainsForSector(sector, labelToDomain) {
  const domains = new Set();
  for (const label of String(sector || '').split(',')) {
    const domain = labelToDomain.get(label.trim().toLowerCase());
    if (domain) domains.add(domain);
  }
  return domains.size ? [...domains].sort().join(', ') : null;
}

module.exports = { ONTOLOGY_PATH, COLUMNS, loadOntology, domainsForSector, parseRow };
