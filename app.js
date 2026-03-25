const express = require("express");
const path = require("path");
const { bodyCapture } = require("./middleware/bodyCapture");
const { errorHandler } = require("./middleware/errorHandler");
const webhookRoutes = require("./routes/webhookRoutes");
const fileRoutes = require("./routes/fileRoutes");

const app = express();

app.use(bodyCapture);
app.use("/webhook", webhookRoutes);
app.use("/files", fileRoutes);
app.use(express.static(path.join(__dirname, "public")));

app.use(errorHandler);

module.exports = app;
