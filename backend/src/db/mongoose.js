const mongoose = require("mongoose");

mongoose.set("strictQuery", true);

let cachedPromise = null;

async function connectMongo() {
  if (mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vi_notes";

  if (!cachedPromise) {
    cachedPromise = mongoose
      .connect(uri)
      .then(() => {
        console.log("[vi-notes] MongoDB connected");
      })
      .catch((err) => {
        cachedPromise = null;
        throw err;
      });
  }

  await cachedPromise;
}

module.exports = { connectMongo };

