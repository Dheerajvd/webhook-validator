const { v4: uuidv4 } = require("uuid");
const { deepExactKeywordMatch } = require("../utils/deepKeywordMatch");

/** @type {{ id: string; createdAt: string; webhookData: unknown }[]} */
const store = [];

function create(webhookData) {
  const record = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    webhookData,
  };
  store.push(record);
  return record;
}

/**
 * @param {{ from?: string; to?: string; limit?: number; search?: string }} filters
 */
function list(filters) {
  let rows = [...store];

  if (filters.from) {
    const fromMs = Date.parse(filters.from);
    if (Number.isNaN(fromMs)) {
      throw new Error("Invalid 'from' date");
    }
    rows = rows.filter((r) => Date.parse(r.createdAt) >= fromMs);
  }

  if (filters.to) {
    const toMs = Date.parse(filters.to);
    if (Number.isNaN(toMs)) {
      throw new Error("Invalid 'to' date");
    }
    rows = rows.filter((r) => Date.parse(r.createdAt) <= toMs);
  }

  if (filters.search != null && filters.search !== "") {
    const keyword = String(filters.search);
    rows = rows.filter((r) => deepExactKeywordMatch(r, keyword));
  }

  if (filters.limit != null) {
    const n = Number(filters.limit);
    if (!Number.isFinite(n) || n < 1) {
      throw new Error("Invalid 'limit'");
    }
    rows = rows.slice(0, Math.floor(n));
  }

  return rows;
}

function getById(id) {
  return store.find((r) => r.id === id) ?? null;
}

function flush() {
  store.length = 0;
}

/** @returns {{ id: string; createdAt: string; webhookData: unknown }[]} */
function drain() {
  const out = [...store];
  store.length = 0;
  return out;
}

module.exports = { create, list, getById, flush, drain };
