const User = require("../models/Users");
const jwt = require("jsonwebtoken");
const redisClient = require("../config/redis");

exports.loginOrRegister = async (req, res) => {
  try {
    const { email } = req.body;

    // 🔍 Redis check (cache)
    let user = await redisClient.get(`user:${email}`);

    if (user) {
      user = JSON.parse(user);
    } else {
      // 🔍 DB check
      user = await User.findOne({ email });

      // 🆕 create user
      if (!user) {
        user = new User({ email });
        await user.save();
      }

      // 🧠 cache in Redis (1 hour)
      await redisClient.set(`user:${email}`, JSON.stringify(user), {
        EX: 60 * 60
      });
    }

    // 🔐 JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: "user"
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 🧠 store token in Redis
    await redisClient.set(`userToken:${token}`, "valid", {
      EX: 60 * 60 * 24 * 7
    });

    res.json({
      message: "Login/Register successful 🔥",
      token,
      user
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};