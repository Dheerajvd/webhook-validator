const express = require("express");
const filesController = require("../controllers/filesController");

const router = express.Router();

router.post("/backup", filesController.backup);
router.get("/", filesController.listBackups);
router.get("/:filename", filesController.getBackup);
router.delete("/:filename", filesController.deleteBackup);

module.exports = router;
