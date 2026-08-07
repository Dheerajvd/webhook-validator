const webhookStore = require("../services/webhookStore");
const { emitWebhook } = require("../services/socketHub");
const { json } = require("../utils/response");

function capture(req, res) {
  const record = webhookStore.create(req.body);
  emitWebhook(record);
  return json(res, 200, { record });
}

function list(req, res) {
  try {
    // Webhook verification logic
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === "ADVIBETECH2026") {
      console.log("Webhook verified successfully.");
      return res.status(200).send(challenge);
    }

    // Webhook listing logic
    const { from, to, limit, search } = req.query;
    const filters = {};
    if (from != null && from !== "") filters.from = String(from);
    if (to != null && to !== "") filters.to = String(to);
    if (limit != null && limit !== "") filters.limit = limit;
    if (search != null && search !== "") filters.search = String(search);

    const records = webhookStore.list(filters);
    return json(res, 200, { records, count: records.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Bad request";
    return json(res, 400, { message });
  }
}

function getById(req, res) {
  const record = webhookStore.getById(req.params.id);
  if (!record) {
    return json(res, 404, { message: "Not found" });
  }
  return json(res, 200, { record });
}

function flush(req, res) {
  webhookStore.flush();
  return json(res, 200, { message: "Store cleared", count: 0 });
}

module.exports = { capture, list, getById, flush };
