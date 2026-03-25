const webhookStore = require("../services/webhookStore");
const backupFileService = require("../services/backupFileService");
const { json } = require("../utils/response");

async function backup(req, res, next) {
  try {
    const records = webhookStore.drain();
    const meta = await backupFileService.writeBackupFile(records);
    return json(res, 200, {
      message: "Store moved to backup file",
      filename: meta.filename,
      count: meta.count,
    });
  } catch (e) {
    return next(e);
  }
}

async function listBackups(req, res, next) {
  try {
    const files = await backupFileService.listBackups();
    return json(res, 200, { files, count: files.length });
  } catch (e) {
    return next(e);
  }
}

async function getBackup(req, res, next) {
  try {
    const name = decodeURIComponent(req.params.filename);
    const records = await backupFileService.readBackup(name);
    return json(res, 200, { filename: name, records, count: records.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Invalid backup filename") {
      return json(res, 400, { message: msg });
    }
    if (e && e.code === "ENOENT") {
      return json(res, 404, { message: "Not found" });
    }
    return next(e);
  }
}

async function deleteBackup(req, res, next) {
  try {
    const name = decodeURIComponent(req.params.filename);
    await backupFileService.deleteBackup(name);
    return json(res, 200, { message: "Deleted", filename: name });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "Invalid backup filename") {
      return json(res, 400, { message: msg });
    }
    if (e && e.code === "ENOENT") {
      return json(res, 404, { message: "Not found" });
    }
    return next(e);
  }
}

module.exports = { backup, listBackups, getBackup, deleteBackup };
