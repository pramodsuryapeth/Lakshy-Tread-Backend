const User = require("../models/Users");
const jwt = require("jsonwebtoken");
const redisClient = require("../config/redis");

exports.loginOrRegister = async (req, res) => {
  try {
    let { email } = req.body;

    // ✅ normalize email (MOST IMPORTANT FIX)
    email = email.trim().toLowerCase();

    // 🔍 Redis check
    let user = await redisClient.get(`user:${email}`);

    if (user) {
      user = JSON.parse(user);
    } else {
      // 🔍 DB check
      user = await User.findOne({ email });

      if (!user) {
        // 🆕 create user only if NOT exists
        user = new User({ email });
        await user.save();
      }

      // 🧠 cache user (1 hour)
      await redisClient.set(`user:${email}`, JSON.stringify(user), {
        EX: 60 * 60
      });
    }

    // ❗ IMPORTANT: Don't generate JWT here if OTP flow is used
    // 👉 Instead just confirm user exists

    res.json({
      message: "User found / created successfully 👍",
      user
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};