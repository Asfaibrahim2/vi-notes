const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");

const sessionsRouter = require("./routes/sessions");

const app = express();

app.use(helmet());
app.use(express.json({ limit: "50kb" }));

const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(
  cors({
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: false,
  })
);

// Safe request logging: does not include request bodies.
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api", sessionsRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[vi-notes] API error:", err?.message || err);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;

