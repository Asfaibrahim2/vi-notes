const mongoose = require("mongoose");

const { Schema } = mongoose;

const WritingSessionSchema = new Schema(
  {
    clientSessionId: { type: String, required: true, unique: true, index: true },
    startedAt: { type: Date, default: () => new Date() },
    endedAt: { type: Date, default: null },

    eventCount: { type: Number, default: 0 },
    keyEventCount: { type: Number, default: 0 },
    pasteEventCount: { type: Number, default: 0 },
  },
  { versionKey: false }
);

module.exports = mongoose.model("WritingSession", WritingSessionSchema);

