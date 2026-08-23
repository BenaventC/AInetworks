/** Text normalization helpers shared by the normalization and matching scripts. */

const LEGAL_SUFFIX_RE = /\b(inc|llc|ltd|limited|corp|corporation|company|co|sa|sas|sarl|gmbh|ag|bv|nv|ab|oy|plc|spa|srl|pte|pty|kk|kg)\b/g;

const stripDiacritics = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Comparison key for entity names. Options are opt-in so each caller keeps the
 * exact aggressiveness it needs instead of redefining a whole variant.
 */
function normalizeKey(value, { parentheses = true, legalSuffixes = false, ampersand = false } = {}) {
  let text = stripDiacritics(value).toLowerCase();
  if (parentheses) text = text.replace(/\s*\([^)]*\)/g, ' ');
  if (ampersand) text = text.replace(/&/g, ' and ');
  if (legalSuffixes) text = text.replace(LEGAL_SUFFIX_RE, ' ');
  return text.replace(/[^a-z0-9]+/g, '').trim();
}

/** Splits a comma-separated database field into trimmed, non-empty values. */
const splitList = (value) => String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean);

/** Joins values back into a database field, removing duplicates and keeping order. */
const joinList = (values) => [...new Set(values.filter(Boolean))].join(', ') || null;

module.exports = { LEGAL_SUFFIX_RE, stripDiacritics, normalizeKey, splitList, joinList };
