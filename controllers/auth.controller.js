const User = require("../models/Users");
const jwt = require("jsonwebtoken"); // ठेवायचं असेल तर ठेव, नाहीतर काढू शकतो

exports.loginOrRegister = async (req, res) => {
  try {
    let { email } = req.body;

    // ✅ normalize email
    email = email.trim().toLowerCase();

    // 🔍 Direct DB check (NO Redis)
    let user = await User.findOne({ email });

    if (!user) {
      // 🆕 create user if not exists
      user = new User({ email });
      await user.save();
    }

    // ❗ OTP flow असल्यामुळे JWT इथे generate करत नाही
    res.json({
      message: "User found / created successfully 👍",
      user,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};