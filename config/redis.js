const redis = require("redis");

const client = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500)
  }
});

// error handling
client.on("error", (err) => {
  console.error("❌ Redis Error:", err);
});

// connect
(async () => {
  try {
    await client.connect();
    console.log("✅ Redis Connected");
  } catch (err) {
    console.error("❌ Connection Failed:", err);
  }
})();

module.exports = client;