# Webhook Validator

Small **Express** service that accepts webhook payloads, keeps them in **memory** for inspection, and can **flush** the store or **move** it to timestamped JSON files on disk. There is **no database**—data is lost when the process exits unless you use the backup API.

## Requirements

- **Node.js** 18+

## Setup

```bash
npm install
```

Optional: create a `.env` file in the project root:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port | `3000` |
| `BACKUPS_DIR` | Absolute path where backup JSON files are written | `./backups` (repo root) |

## Run

```bash
npm start
```

Development (restart on file changes):

```bash
npm run dev
```

The server logs the listening URL on startup (for example `http://localhost:3000`).

## Response shape

All JSON responses use:

```json
{
  "status": 200,
  "data": { }
}
```

`status` matches the HTTP status when successful; errors use `400`, `404`, or `500` as appropriate.

## API

### Webhooks (`/webhook`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/webhook` | Store the request body as `webhookData` with a new `id` (UUID) and `createdAt` (ISO 8601). |
| `GET` | `/webhook` | List stored webhooks. |
| `GET` | `/webhook?from=&to=&limit=` | Same as above with optional filters: `from` / `to` (ISO 8601, inclusive on `createdAt`), `limit` (positive integer, max rows after filtering). Omitting filters returns all records. |
| `GET` | `/webhook/:id` | One record by UUID, or **404** if missing. |
| `POST` | `/webhook/flush` | Clear the in-memory store. |

**Body handling:** Non-JSON or invalid JSON is wrapped (for example `{ "_raw": "...", "_contentType": "..." }`). JSON bodies are parsed when possible.

### Files & backups (`/files`)

Backups are written under **`BACKUPS_DIR`** (default: `backups/` next to the app root). That folder is listed in `.gitignore`.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/files/backup` | **Moves** all in-memory webhooks into a new file and **empties** the store. Filename pattern: `backup-timestamp-DD-MM-YYYY-HHmmss.json`. |
| `GET` | `/files` | List backup files (name, size, timestamps). |
| `GET` | `/files/:filename` | Read one backup; response includes parsed `records` array. |
| `DELETE` | `/files/:filename` | Delete a backup file. |

Only filenames matching the server’s backup pattern are allowed (prevents path traversal).

## Postman

Import the collection and optional local environment:

- `postman/Webhook-Validator.postman_collection.json`
- `postman/Local.postman_environment.json`

Set **`{{BASE_URL}}`** in your environment (e.g. `http://localhost:3000`, no trailing slash).

## Example `curl` calls

```bash
BASE=http://localhost:3000

# Store a payload
curl -s -X POST "$BASE/webhook" -H 'Content-Type: application/json' \
  -d '{"event":"test"}'

# List all
curl -s "$BASE/webhook"

# List with filters
curl -s "$BASE/webhook?from=2026-01-01T00:00:00.000Z&limit=5"

# Flush memory
curl -s -X POST "$BASE/webhook/flush"

# Backup to disk (clears memory)
curl -s -X POST "$BASE/files/backup"

# List backup files
curl -s "$BASE/files"
```

## Deploy on Netlify (serverless)

Netlify runs this app as a **single serverless function** (`serverless-http`) behind your site URL. Only `/webhook` and `/files` are routed to Express; everything else can be served from `public/` as static files.

### 1. Prerequisites

- Code in a **Git** repo (GitHub, GitLab, or Bitbucket).
- A [Netlify](https://www.netlify.com/) account.

### 2. Configure environment variables (Site settings → Environment variables)

| Name | Value | Purpose |
|------|--------|---------|
| `BACKUPS_DIR` | `/tmp/webhook-validator-backups` | Writable path on Netlify Functions (project disk is read-only). |

Optional: set `NODE_VERSION` to `20` under **Build & deploy → Environment** if you need a specific Node version.

### 3. Create the site

1. In Netlify: **Add new site** → **Import an existing project**.
2. Connect the Git provider and select this repository.
3. Build settings are read from **`netlify.toml`**:
   - **Build command:** `npm install`
   - **Publish directory:** `public`
4. Add the **`BACKUPS_DIR`** variable above, then **Deploy site**.

### 4. After deploy

- **Base URL:** `https://<your-site-name>.netlify.app` (no trailing slash).
- Use that value as **`{{BASE_URL}}`** in Postman or `curl` (same paths as locally: `/webhook`, `/files`, …).

### Netlify limitations (important)

- **In-memory webhooks:** Serverless may run **multiple isolated instances**. The in-memory store is **not shared** and may **reset between requests**. Do not rely on “capture then list” across requests in production on Netlify; use backups or run the app on a **long-lived Node host** (Railway, Render, Fly.io, a VPS) if you need reliable memory state.
- **Backup files:** With `BACKUPS_DIR` under `/tmp`, files can be **lost** on cold starts or when another instance runs. For durable storage you would need an external store (e.g. object storage or a database)—not included here.
- **Timeouts:** Function execution time is limited by your Netlify plan (default is short; increase in **Functions** settings if needed).

## Project layout

```
app.js           # Express app (used locally and by Netlify)
config/          # Port and paths
controllers/     # HTTP handlers
middleware/      # Raw body capture, errors
models/          # Record shape (JSDoc)
netlify/
  functions/
    api.js       # Netlify serverless entry (wraps Express)
routes/          # Route maps
services/        # Store and backup file logic
utils/           # JSON response helper
public/          # Static files (published on Netlify)
postman/         # Collection + environment
netlify.toml     # Netlify build + redirects
server.js        # Local entry (HTTP server)
```

## Limitations

- In-memory store does not survive restarts; on **Netlify** it is also unreliable across requests (see above).
- Large payloads are capped by the raw body limit in `middleware/bodyCapture.js` (10 MB).
