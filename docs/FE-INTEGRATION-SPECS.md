# Frontend integration specification

This document describes how a client (web app, mobile app, or tooling) should integrate with the **Webhook Validator** backend over **HTTP** and **Socket.IO**.

**Scope:** REST JSON APIs under `/webhook` and `/files`, plus real-time events on Socket.IO when the **long-lived Node server** is used (not Netlify Functions).

---

## 1. Environments and base URL

| Context | Base URL example | HTTP APIs | Socket.IO |
|--------|------------------|-----------|-----------|
| Local Node server (`npm start`) | `http://localhost:3000` | Yes | Yes |
| Netlify (or similar serverless) | `https://<site>.netlify.app` | Yes (same paths) | **No** (see §5) |

Configure a single **`BASE_URL`** in the frontend (e.g. environment variable) with **no trailing slash**.

**Port:** Locally, `PORT` defaults to `3000` unless set in `.env`.

---

## 2. Global response envelope

Every JSON response uses this shape:

```json
{
  "status": 200,
  "data": { }
}
```

- **`status`** duplicates the HTTP status code for convenience.
- **`data`** holds the payload (success or error details).

**Errors:**

- **400** — `data` typically includes `{ "message": "<reason>" }` (e.g. invalid query).
- **404** — `data` includes `{ "message": "Not found" }` where applicable.
- **500** — `data` includes `{ "message": "<reason>" }` for unhandled server errors.

Clients should read **`response.status`** (HTTP) and optionally validate **`body.status`**.

---

## 3. Shared types (conceptual)

### 3.1 `WebhookRecord`

Emitted by capture, list, get-by-id, and Socket.IO event `webhook`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` (UUID) | Unique id for this stored webhook. |
| `createdAt` | `string` (ISO 8601) | Server time when the record was created. |
| `webhookData` | `unknown` | Parsed body (object, or wrapper with `_raw` / `_contentType` for non-JSON). |

### 3.2 `BackupFileMeta` (list files)

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Filename (see §4.3). |
| `size` | `number` | Size in bytes. |
| `createdAt` | `string` (ISO 8601) | Filesystem birth time when available. |
| `modifiedAt` | `string` (ISO 8601) | Last modification time. |

---

## 4. REST API

All paths are relative to **`BASE_URL`**.

### 4.1 Webhooks — `POST /webhook`

Stores the request body and returns the new record.

| Item | Value |
|------|--------|
| **Method** | `POST` |
| **Body** | Any JSON (recommended `Content-Type: application/json`). Other content types may be normalized to `webhookData` with `_raw` / `_contentType`. |
| **Success** | HTTP **200**, `data.record` is a **`WebhookRecord`**. |
| **Socket** | If Socket.IO is available, the same **`WebhookRecord`** is broadcast (§5). |

**Example success `data`:**

```json
{
  "record": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2026-03-25T12:00:00.000Z",
    "webhookData": { "event": "checkout.completed" }
  }
}
```

---

### 4.2 Webhooks — `GET /webhook`

Lists stored webhooks with optional filters.

| Item | Value |
|------|--------|
| **Method** | `GET` |
| **Query** | All optional; omit to return all records (subject to server limits). |

| Query param | Type | Description |
|-------------|------|-------------|
| `from` | string | ISO 8601 — keep rows with `createdAt >= from`. |
| `to` | string | ISO 8601 — keep rows with `createdAt <= to`. |
| `limit` | number | Positive integer; max rows **after** date filters. |
| `search` | string | Exact match: any **nested property name** or **leaf value** in the full record must equal this string (see server implementation). |

**Filter order (server):** `from` / `to` → `search` → `limit`.

**Success:** HTTP **200**, `data.records` is **`WebhookRecord[]`**, `data.count` is `records.length`.

**Error:** HTTP **400** if a filter is invalid (e.g. bad date or limit).

---

### 4.3 Webhooks — `GET /webhook/:id`

| Item | Value |
|------|--------|
| **Method** | `GET` |
| **Path param** | `id` — UUID of the record. |

**Success:** HTTP **200**, `data.record` is **`WebhookRecord`**.

**Error:** HTTP **404** if not found.

---

### 4.4 Webhooks — `POST /webhook/flush`

Clears the in-memory store (does not delete disk backup files).

| Item | Value |
|------|--------|
| **Method** | `POST` |
| **Body** | None required |

**Success:** HTTP **200**, e.g. `data`: `{ "message": "Store cleared", "count": 0 }`.

---

### 4.5 Files — `POST /files/backup`

Moves all in-memory webhooks into one JSON file and **empties** the store.

| Item | Value |
|------|--------|
| **Method** | `POST` |

**Success:** HTTP **200**, `data` includes:

- `message` — human-readable confirmation
- `filename` — created file name
- `count` — number of records written

**Filename pattern (server-generated):**

`backup-timestamp-DD-MM-YYYY-HHmmss.json`  
Example: `backup-timestamp-25-03-2026-143052.json`

Regex accepted by read/delete: `^backup-timestamp-\d{2}-\d{2}-\d{4}-\d{6}\.json$`

---

### 4.6 Files — `GET /files`

Lists backup files on disk.

| Item | Value |
|------|--------|
| **Method** | `GET` |

**Success:** HTTP **200**, `data.files` is **`BackupFileMeta[]`**, `data.count` is length.

---

### 4.7 Files — `GET /files/:filename`

Reads one backup file; returns parsed JSON array of **`WebhookRecord`**-shaped objects.

| Item | Value |
|------|--------|
| **Method** | `GET` |
| **Path param** | `filename` — URL-encode if needed. |

**Success:** HTTP **200**, `data.filename`, `data.records` (array), `data.count`.

**Errors:** **400** invalid filename; **404** file missing.

---

### 4.8 Files — `DELETE /files/:filename`

Deletes a backup file.

| Item | Value |
|------|--------|
| **Method** | `DELETE` |
| **Path param** | `filename` |

**Success:** HTTP **200**, `data.message`, `data.filename`.

**Errors:** **400** invalid filename; **404** file missing.

---

## 5. Socket.IO (real-time)

### 5.1 When it is available

Socket.IO runs only when **`SOCKETS_ENABLED`** is true (default) **and** the app runs as **`node server.js`** (e.g. `npm start`). Set **`SOCKETS_ENABLED=false`** to disable sockets and skip any Redis connection for realtime. It is **not** available when the API is served only through **Netlify Functions** or other serverless HTTP wrappers.

The frontend should treat Socket.IO as **optional**: use **`GET /webhook`** to poll or refresh if sockets are unavailable.

### 5.2 Connection

- **URL:** Same origin and port as **`BASE_URL`** (e.g. `http://localhost:3000`).
- **Library:** `socket.io-client` major version **4.x** (aligned with server `socket.io` v4).
- **Transport:** Prefer `websocket` with `polling` fallback (default client behavior).

**Example (browser):**

```html
<script src="/socket.io/socket.io.js"></script>
<script>
  const socket = io({ transports: ["websocket", "polling"] });
</script>
```

**Example (bundled app):**

```js
import { io } from "socket.io-client";
const socket = io(BASE_URL, { transports: ["websocket", "polling"] });
```

### 5.3 Events

| Direction | Event name | Payload | Description |
|-----------|------------|---------|-------------|
| Server → client | `webhook` | **`WebhookRecord`** | After each successful **`POST /webhook`** (same object as `data.record`). With **Redis** (see §5.6), other app instances also receive and broadcast the same payload. |
| Client → server | `ping` | any (optional) | Application-level ping; use **ack** or listen for **`pong`**. |
| Server → client | `pong` | `{ t: number, payload }` | Response to **`ping`** (`t` is server ms timestamp). |

Subscribe with:

```js
socket.on("webhook", (record) => {
  // record: { id, createdAt, webhookData }
});
```

**Application ping / pong (latency or health):**

```js
socket.emit("ping", { seq: 1 }, (pong) => {
  console.log("rtt ack", pong); // { t, payload }
});
socket.on("pong", (pong) => {
  /* if you used emit without ack */
});
```

### 5.4 Transport heartbeat (Engine.IO)

The server configures **Socket.IO / Engine.IO** ping intervals (defaults **25s** interval, **20s** timeout). These keep the connection alive at the protocol level and are separate from the **`ping` / `pong`** events above.

Environment (server): **`SOCKET_PING_INTERVAL_MS`**, **`SOCKET_PING_TIMEOUT_MS`**.

### 5.5 CORS (Socket.IO)

The server configures Socket.IO CORS for browser clients. For **`SOCKET_CORS_ORIGIN`**, see server `config` (default `*` locally; comma-separated origins supported for production).

### 5.6 REST and CORS

The Express app uses the **`cors`** middleware for **`/webhook`** and **`/files`** (and preflight **`OPTIONS`**). Default **`API_CORS_ORIGIN`** is **`*`** (any origin). Restrict with a comma-separated allowlist in production if needed.

### 5.7 Redis pub/sub (multi-instance)

Requires **`SOCKETS_ENABLED=true`** and **`REDIS_URL`**. Each **`POST /webhook`** publishes the **`WebhookRecord`** JSON to a Redis channel (default **`webhook:events`**). Every running Node process **subscribes** and **`io.emit("webhook", record)`** to its own Socket.IO clients. If sockets are disabled, **`REDIS_URL`** is ignored.

**Frontend impact:** None — still connect with **`socket.io-client`** to your app’s HTTP origin and listen for **`webhook`**. Scaling is server-side.

**Env (server):** `REDIS_URL` (e.g. `redis://localhost:6379`), optional `REDIS_WEBHOOK_CHANNEL`. If Redis is unavailable at startup, the server logs and falls back to **direct emit** on that instance only.

---

## 6. Deployment matrix (FE expectations)

| Feature | Local `server.js` | Netlify (serverless) |
|---------|-------------------|----------------------|
| REST `/webhook`, `/files` | Yes | Yes |
| In-memory `GET` list consistency | Single process | Unreliable across invocations |
| Socket.IO | Yes | No |
| Redis fan-out | Yes (if `REDIS_URL`) | N/A |
| Durable `/tmp` backups | N/A | Ephemeral |

---

## 7. References

- Example page: **`/socket-monitor.html`** (when served by the Node server).
- Postman collection: `postman/` (if present in repo).
