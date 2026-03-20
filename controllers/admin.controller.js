// controllers/admin.controller.js
const jwt = require("jsonwebtoken");

exports.loginAdmin = (req, res) => {
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

    res.json({
      message: "Admin login successful 🔥",
      token
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

