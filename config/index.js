const path = require("path");
require("dotenv").config();

const defaultBackupsDir = path.join(__dirname, "..", "backups");

module.exports = {
  port: Number(process.env.PORT) || 3000,
  backupsDir: process.env.BACKUPS_DIR
    ? path.resolve(process.env.BACKUPS_DIR)
    : defaultBackupsDir,
};
