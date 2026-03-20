const User = require("../models/User");
const nodemailer = require("nodemailer");

// 🔐 transporter (env वापरून)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 📩 Send OTP
exports.sendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const otp = Math.floor(100000 + Math.random() * 900000);

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({ email });
    }

    user.otp = otp;
    user.otpExpire = Date.now() + 5 * 60 * 1000;
    await user.save();

    // 📧 send mail
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}`
    });

    res.json({ message: "OTP sent to email 📩" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Verify OTP
exports.verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found ❌" });
    }

    if (user.otp != otp) {
      return res.status(400).json({ message: "Invalid OTP ❌" });
    }

    if (user.otpExpire < Date.now()) {
      return res.status(400).json({ message: "OTP expired ⏳" });
    }

    // 🔐 clear OTP
    user.otp = null;
    user.otpExpire = null;
    await user.save();

    res.json({ message: "Login successful 🔥", user });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};