const express = require("express");
const webhookController = require("../controllers/webhookController");

const router = express.Router();

router.post("/", webhookController.capture);
router.get("/", webhookController.list);
router.post("/flush", webhookController.flush);
router.get("/:id", webhookController.getById);

module.exports = router;
