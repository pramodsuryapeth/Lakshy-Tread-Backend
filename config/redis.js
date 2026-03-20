const redis = require("redis");

const client = redis.createClient({
  url: "redis://127.0.0.1:6379"
});

client.connect()
  .then(() => console.log("✅ Redis Connected"))
  .catch(err => console.log("❌ Redis Error", err));

module.exports = client;