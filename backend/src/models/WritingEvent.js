const mongoose = require("mongoose");

const { Schema } = mongoose;

const WritingEventSchema = new Schema(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "WritingSession", required: true, index: true },

    // We intentionally store behavior/timing only (no typed/pasted content).
    type: { type: String, enum: ["key", "paste"], required: true },
    ts: { type: Date, required: true },
    serverReceivedAt: { type: Date, default: () => new Date() },

    // Key timing fields
    phase: { type: String, enum: ["down", "up"], default: null },
    interKeyMs: { type: Number, default: null, min: 0 },
    holdMs: { type: Number, default: null, min: 0 },

    // Optional coarse class (still not raw keys/characters)
    keyClass: { type: String, default: null },
    isRepeat: { type: Boolean, default: null },

    // Paste timing fields
    pasteLength: { type: Number, default: null, min: 0 },
  },
  { versionKey: false, strict: true }
);

WritingEventSchema.index({ sessionId: 1, ts: 1 });

module.exports = mongoose.model("WritingEvent", WritingEventSchema);

