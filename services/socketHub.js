/** @type {import("socket.io").Server | null} */
let io = null;

/** @type {((record: unknown) => Promise<void>) | null} */
let redisPublish = null;

/** @param {import("socket.io").Server} ioInstance */
function setIo(ioInstance) {
  io = ioInstance;
}

/**
 * When set, `emitWebhook` publishes to Redis only; subscribers (all instances) emit to Socket.IO.
 * When null, broadcasts directly on this process.
 *
 * @param {(record: unknown) => Promise<void>} publishFn
 */
function setRedisPublisher(publishFn) {
  redisPublish = publishFn;
}

/**
 * Broadcast full webhook record to all connected Socket.IO clients (this instance and, via Redis, others).
 * No-op when the HTTP server is not running (e.g. Netlify).
 *
 * @param {{ id: string; createdAt: string; webhookData: unknown }} record
 */
function emitWebhook(record) {
  if (redisPublish) {
    redisPublish(record).catch((err) => {
      console.error("[redis] publish failed, emitting locally", err.message);
      if (io) io.emit("webhook", record);
    });
    return;
  }
  if (io) {
    io.emit("webhook", record);
  }
}

module.exports = { setIo, setRedisPublisher, emitWebhook };
