const express = require("express");
const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const WritingSession = require("../models/WritingSession");
const WritingEvent = require("../models/WritingEvent");

const router = express.Router();

const DISALLOWED_FIELDS = [
  "text",
  "value",
  "clipboardText",
  "clipboard",
  "clipboardData",
  "key",
  "code",
  "characters",
  "typedText",
  "pasteText",
];

function hasDisallowedFields(body) {
  if (!body || typeof body !== "object") return false;
  return DISALLOWED_FIELDS.some((f) => Object.prototype.hasOwnProperty.call(body, f));
}

function requireNumber(val, fieldName, { allowNull = true } = {}) {
  if (val === null || val === undefined) {
    if (allowNull) return null;
    throw new Error(`${fieldName} is required`);
  }
  const n = Number(val);
  if (!Number.isFinite(n)) throw new Error(`${fieldName} must be a number`);
  return n;
}

router.post("/sessions", async (req, res, next) => {
  try {
    const clientSessionId =
      typeof req.body?.clientSessionId === "string" && req.body.clientSessionId.trim()
        ? req.body.clientSessionId.trim()
        : randomUUID();

    const session = await WritingSession.findOneAndUpdate(
      { clientSessionId },
      { $setOnInsert: { startedAt: new Date() } },
      { upsert: true, new: true }
    );

    res.status(201).json({ sessionId: session._id.toString(), clientSessionId: session.clientSessionId });
  } catch (err) {
    next(err);
  }
});

router.post("/sessions/:sessionId/events", async (req, res, next) => {
  try {
    if (hasDisallowedFields(req.body)) {
      return res.status(400).json({ error: "Payload contains disallowed text/keystroke content fields" });
    }

    const { sessionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ error: "Invalid sessionId" });
    }

    const session = await WritingSession.findById(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const type = req.body?.type;
    const ts = req.body?.ts;

    if (type !== "key" && type !== "paste") {
      return res.status(400).json({ error: 'Event "type" must be either "key" or "paste"' });
    }
    const tsNum = requireNumber(ts, "ts", { allowNull: false });
    const eventTs = new Date(tsNum);

    // Coarse bounds: protects DB from accidental huge values.
    const clamp = (n, max) => (n > max ? max : n);

    let eventPayload = { sessionId, type, ts: eventTs, serverReceivedAt: new Date() };

    if (type === "key") {
      const phase = req.body?.phase;
      if (phase !== "down" && phase !== "up") {
        return res.status(400).json({ error: 'For type "key", phase must be "down" or "up"' });
      }

      const interKeyMs =
        phase === "down" ? requireNumber(req.body?.interKeyMs, "interKeyMs", { allowNull: true }) : null;
      const holdMs = phase === "up" ? requireNumber(req.body?.holdMs, "holdMs", { allowNull: true }) : null;

      const keyClass = typeof req.body?.keyClass === "string" ? req.body.keyClass : null;
      const isRepeat = typeof req.body?.isRepeat === "boolean" ? req.body.isRepeat : null;

      eventPayload = {
        ...eventPayload,
        phase,
        interKeyMs: interKeyMs === null ? null : clamp(interKeyMs, 60000),
        holdMs: holdMs === null ? null : clamp(holdMs, 10000),
        keyClass,
        isRepeat,
      };
    } else {
      const pasteLength = requireNumber(req.body?.pasteLength, "pasteLength", { allowNull: false });
      eventPayload = {
        ...eventPayload,
        pasteLength: clamp(pasteLength, 1_000_000),
      };
    }

    const created = await WritingEvent.create(eventPayload);

    const inc = type === "paste" ? { pasteEventCount: 1, eventCount: 1 } : { keyEventCount: 1, eventCount: 1 };
    await WritingSession.findByIdAndUpdate(sessionId, { $inc: inc });

    return res.status(201).json({ eventId: created._id.toString() });
  } catch (err) {
    next(err);
  }
});

router.post("/sessions/:sessionId/end", async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ error: "Invalid sessionId" });
    }

    const endedAt = req.body?.endedAt;
    const endedAtNum = endedAt === undefined ? Date.now() : requireNumber(endedAt, "endedAt", { allowNull: false });

    const updated = await WritingSession.findByIdAndUpdate(
      sessionId,
      { endedAt: new Date(endedAtNum) },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Session not found" });

    return res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get("/sessions/:sessionId", async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ error: "Invalid sessionId" });
    }

    const session = await WritingSession.findById(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    return res.status(200).json({
      sessionId: session._id.toString(),
      clientSessionId: session.clientSessionId,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      eventCount: session.eventCount,
      keyEventCount: session.keyEventCount,
      pasteEventCount: session.pasteEventCount,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/sessions/:sessionId/events", async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ error: "Invalid sessionId" });
    }

    const limitRaw = req.query.limit;
    const limit = limitRaw === undefined ? 200 : Math.max(1, Math.min(Number(limitRaw) || 200, 1000));

    const events = await WritingEvent.find({ sessionId })
      .sort({ ts: 1 })
      .limit(limit)
      .select({
        type: 1,
        ts: 1,
        serverReceivedAt: 1,
        phase: 1,
        interKeyMs: 1,
        holdMs: 1,
        keyClass: 1,
        isRepeat: 1,
        pasteLength: 1,
        _id: 1,
      });

    return res.status(200).json({
      sessionId,
      limit,
      events,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

