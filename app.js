const express = require("express");
const path = require("path");
const cors = require("cors");
const config = require("./config");
const { bodyCapture } = require("./middleware/bodyCapture");
const { errorHandler } = require("./middleware/errorHandler");
const webhookRoutes = require("./routes/webhookRoutes");
const fileRoutes = require("./routes/fileRoutes");

const app = express();

const rawApiCors = String(config.apiCorsOrigin || "*").trim();
const corsOptions =
  rawApiCors === "*"
    ? { origin: "*" }
    : { origin: rawApiCors.split(",").map((s) => s.trim()) };

app.use(cors(corsOptions));
app.use(bodyCapture);
app.use("/webhook", webhookRoutes);
app.use("/files", fileRoutes);
app.use(express.static(path.join(__dirname, "public")));

app.use(errorHandler);

module.exports = app;
