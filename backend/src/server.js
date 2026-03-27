const app = require("./app");
const { connectMongo } = require("./db/mongoose");

const port = Number(process.env.PORT) || 5000;

async function start() {
  await connectMongo();

  app.listen(port, () => {
    console.log(`[vi-notes] API listening on :${port}`);
  });
}

start().catch((err) => {
  console.error("[vi-notes] Failed to start server:", err);
  process.exit(1);
});

