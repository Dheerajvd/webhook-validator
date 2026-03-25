const fs = require("fs/promises");
const path = require("path");
const config = require("../config");

/** Matches files we create: backup-timestamp-DD-MM-YYYY-HHmmss.json */
const BACKUP_NAME_RE = /^backup-timestamp-\d{2}-\d{2}-\d{4}-\d{6}\.json$/;

function buildBackupFilename(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  const HH = pad(date.getHours());
  const MM = pad(date.getMinutes());
  const SS = pad(date.getSeconds());
  return `backup-timestamp-${dd}-${mm}-${yyyy}-${HH}${MM}${SS}.json`;
}

function assertSafeFilename(name) {
  if (typeof name !== "string" || !BACKUP_NAME_RE.test(name)) {
    throw new Error("Invalid backup filename");
  }
  const resolved = path.resolve(config.backupsDir, name);
  if (!resolved.startsWith(path.resolve(config.backupsDir) + path.sep)) {
    throw new Error("Invalid backup path");
  }
  return resolved;
}

async function ensureBackupsDir() {
  await fs.mkdir(config.backupsDir, { recursive: true });
}

/**
 * @param {{ id: string; createdAt: string; webhookData: unknown }[]} records
 */
async function writeBackupFile(records) {
  await ensureBackupsDir();
  const filename = buildBackupFilename();
  const abs = path.join(config.backupsDir, filename);
  const payload = JSON.stringify(records, null, 2);
  await fs.writeFile(abs, payload, "utf8");
  return { filename, path: abs, count: records.length };
}

async function listBackups() {
  await ensureBackupsDir();
  const names = await fs.readdir(config.backupsDir);
  const entries = await Promise.all(
    names
      .filter((n) => BACKUP_NAME_RE.test(n))
      .map(async (name) => {
        const abs = path.join(config.backupsDir, name);
        const st = await fs.stat(abs);
        return {
          name,
          size: st.size,
          createdAt: st.birthtime.toISOString(),
          modifiedAt: st.mtime.toISOString(),
        };
      })
  );
  entries.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  return entries;
}

async function readBackup(name) {
  const abs = assertSafeFilename(name);
  const raw = await fs.readFile(abs, "utf8");
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("Backup is not a JSON array");
    }
    return parsed;
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error("Invalid backup JSON");
    }
    throw e;
  }
}

async function deleteBackup(name) {
  const abs = assertSafeFilename(name);
  await fs.unlink(abs);
}

module.exports = {
  buildBackupFilename,
  writeBackupFile,
  listBackups,
  readBackup,
  deleteBackup,
};
