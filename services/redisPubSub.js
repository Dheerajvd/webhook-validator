const Redis = require("ioredis");
const config = require("../config");

/**
 * @param {import("socket.io").Server} io
 * @returns {Promise<{ publish: (record: unknown) => Promise<void>; close: () => Promise<void> } | null>}
 */
async function attachRedisPubSub(io) {
  if (!config.redisUrl) {
    return null;
  }

  const channel = config.redisChannel;

  try {
    const publisher = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });

    const subscriber = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });

    publisher.on("error", (err) => {
      console.error("[redis] publisher error", err.message);
    });
    subscriber.on("error", (err) => {
      console.error("[redis] subscriber error", err.message);
    });

    subscriber.on("message", (ch, message) => {
      if (ch !== channel) return;
      try {
        const record = JSON.parse(message);
        io.emit("webhook", record);
      } catch (e) {
        console.error("[redis] invalid webhook payload", e);
      }
    });

    await subscriber.subscribe(channel);

    async function publish(record) {
      await publisher.publish(channel, JSON.stringify(record));
    }

    async function close() {
      await publisher.quit();
      await subscriber.quit();
    }

    console.log(`[redis] pub/sub connected, channel "${channel}"`);
    return { publish, close };
  } catch (e) {
    console.error("[redis] failed to connect; continuing without pub/sub", e);
    return null;
  }
}

module.exports = { attachRedisPubSub };
