const { json } = require("../utils/response");

function errorHandler(err, req, res, next) {
  void next;
  const message = err instanceof Error ? err.message : "Internal error";
  return json(res, 500, { message });
}

module.exports = { errorHandler };
