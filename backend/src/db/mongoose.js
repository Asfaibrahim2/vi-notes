const mongoose = require("mongoose");

async function connectMongo() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vi_notes";

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri);
  console.log("[vi-notes] MongoDB connected");
}

module.exports = { connectMongo };

