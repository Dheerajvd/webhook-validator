/**
 * @param {import('express').Response} res
 * @param {number} status
 * @param {unknown} data
 */
function json(res, status, data) {
  return res.status(status).json({ status, data });
}

module.exports = { json };
