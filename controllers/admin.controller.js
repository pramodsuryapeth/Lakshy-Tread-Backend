const jwt = require("jsonwebtoken");
const redisClient = require("../config/redis");

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔐 check with env
    if (
      email !== process.env.ADMIN_EMAIL ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({ message: "Invalid credentials ❌" });
    }

    // 🔥 generate token
    const token = jwt.sign(
      { role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 🧠 Store token in Redis (optional but useful)
    await redisClient.set(`admin:${token}`, "valid", {
      EX: 60 * 60 * 24 * 7 // 7 days
    });

    res.json({
      message: "Admin login successful 🔥",
      token
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};