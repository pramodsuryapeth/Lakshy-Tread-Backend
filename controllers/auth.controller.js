const User = require("../models/Users");
const jwt = require("jsonwebtoken");

exports.loginOrRegister = async (req, res) => {
  try {
    const { email } = req.body;

    // 🔍 check user
    let user = await User.findOne({ email });

    // 🆕 create if not exists
    if (!user) {
      user = new User({ email });
      await user.save();
    }

    // 🔐 JWT Token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: "user"
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login/Register successful 🔥",
      token,
      user
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
