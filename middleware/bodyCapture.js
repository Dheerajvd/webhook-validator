const express = require("express");

const rawParser = express.raw({ type: "*/*", limit: "10mb" });

function bodyCapture(req, res, next) {
  rawParser(req, res, (err) => {
    if (err) return next(err);
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || buf.length === 0) {
      req.body = {};
      return next();
    }
    const str = buf.toString("utf8");
    const ct = (req.get("content-type") || "").toLowerCase();
    if (ct.includes("application/json")) {
      try {
        req.body = JSON.parse(str);
        return next();
      } catch {
        req.body = { _raw: str, _contentType: req.get("content-type") || null };
        return next();
      }
    }
    const t = str.trim();
    if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
      try {
        req.body = JSON.parse(str);
        return next();
      } catch {
        req.body = { _raw: str, _contentType: req.get("content-type") || null };
        return next();
      }
    }
    req.body = { _raw: str, _contentType: req.get("content-type") || null };
    next();
  });
}

module.exports = { bodyCapture };
