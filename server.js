const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const config = require("./config");
const socketHub = require("./services/socketHub");
const { attachRedisPubSub } = require("./services/redisPubSub");

const server = http.createServer(app);

async function startSockets() {
  if (!config.socketsEnabled) {
    return;
  }

  const rawCors = String(config.socketCorsOrigin).trim();
  const corsOrigin =
    rawCors === "*" ? "*" : rawCors.split(",").map((s) => s.trim());

  const io = new Server(server, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"],
    },
    pingInterval: config.socketPingIntervalMs,
    pingTimeout: config.socketPingTimeoutMs,
  });

  socketHub.setIo(io);

  io.on("connection", (socket) => {
    socket.on("ping", (payload, ack) => {
      const pong = { t: Date.now(), payload: payload ?? null };
      if (typeof ack === "function") {
        ack(pong);
      } else {
        socket.emit("pong", pong);
      }
    });
  });

  const redisBus = await attachRedisPubSub(io);
  if (redisBus) {
    socketHub.setRedisPublisher(redisBus.publish);
  }
}

async function start() {
  await startSockets();

  server.listen(config.port, () => {
    console.log(`Webhook validator listening on http://localhost:${config.port}`);
    if (config.socketsEnabled) {
      console.log(
        `Socket.IO: event "webhook" on capture; app ping/pong; Engine ping ${config.socketPingIntervalMs}ms / timeout ${config.socketPingTimeoutMs}ms`
      );
      if (config.redisUrl) {
        console.log("Redis pub/sub: enabled for webhook fan-out");
      } else {
        console.log("Redis: not configured (set REDIS_URL when SOCKETS_ENABLED=true for multi-instance)");
      }
    } else {
      console.log("Sockets: disabled (SOCKETS_ENABLED=false); Redis not used");
    }
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
