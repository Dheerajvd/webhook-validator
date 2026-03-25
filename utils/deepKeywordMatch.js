/**
 * Returns true if `keyword` equals any property name or any leaf value in `subject`
 * (arrays and plain objects are walked recursively). Comparison is exact string equality:
 * keys use `key === keyword`; primitives use `String(value) === keyword`.
 *
 * @param {unknown} subject
 * @param {string} keyword non-empty
 */
function deepExactKeywordMatch(subject, keyword) {
  function walk(node) {
    if (node === null || node === undefined) {
      return false;
    }

    const t = typeof node;
    if (
      t === "string" ||
      t === "number" ||
      t === "boolean" ||
      t === "bigint" ||
      t === "symbol"
    ) {
      return String(node) === keyword;
    }

    if (Array.isArray(node)) {
      return node.some((item, idx) => String(idx) === keyword || walk(item));
    }

    if (t === "object") {
      if (node instanceof Date) {
        return node.toISOString() === keyword || String(node) === keyword;
      }
      return Object.entries(node).some(([k, v]) => k === keyword || walk(v));
    }

    return false;
  }

  return walk(subject);
}

module.exports = { deepExactKeywordMatch };
