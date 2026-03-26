const path = require("path");
require("dotenv").config();

const defaultBackupsDir = path.join(__dirname, "..", "backups");

/**
 * @param {string | undefined} value
 * @param {boolean} [defaultValue=true]
 */
function parseBoolEnv(value, defaultValue = true) {
  if (value === undefined || value === "") return defaultValue;
  const s = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(s)) return true;
  if (["0", "false", "no", "off"].includes(s)) return false;
  return defaultValue;
}

const socketsEnabled = parseBoolEnv(process.env.SOCKETS_ENABLED, true);

const redisUrl =
  socketsEnabled && process.env.REDIS_URL?.trim()
    ? process.env.REDIS_URL.trim()
    : null;

module.exports = {
  port: Number(process.env.PORT) || 3000,
  backupsDir: process.env.BACKUPS_DIR
    ? path.resolve(process.env.BACKUPS_DIR)
    : defaultBackupsDir,
  /** REST + preflight; `*` or comma-separated origins. */
  apiCorsOrigin: (process.env.API_CORS_ORIGIN ?? "*").trim() || "*",
  socketCorsOrigin: process.env.SOCKET_CORS_ORIGIN || "*",
  redisUrl,
  redisChannel: process.env.REDIS_WEBHOOK_CHANNEL || "webhook:events",
  socketPingIntervalMs: Number(process.env.SOCKET_PING_INTERVAL_MS) || 25000,
  socketPingTimeoutMs: Number(process.env.SOCKET_PING_TIMEOUT_MS) || 20000,
  /** When false, Socket.IO is not started and Redis pub/sub is not used. */
  socketsEnabled,
};
