const User = require("../models/Users");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const transporter = require("../config/mail");

// 📩 Send OTP
exports.sendEmailOTP = async (req, res) => {
  try {
    const email = req.body.email.trim().toLowerCase();

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 🔥 DIRECT UPDATE (BEST APPROACH)
    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          otp: otp,
          otpExpire: new Date(Date.now() + 5 * 60 * 1000)
        }
      },
      {
        new: true,
        upsert: true
      }
    );

    console.log("OTP saved for:", email);
    console.log("OTP:", user.otp);

    // 📧 send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Lakshy Trendzz | Your OTP Code 🔐",
      text: `
Hello 👋,

Welcome to Lakshy Trendzz!

Your One-Time Password (OTP) for login is:

🔐 OTP: ${otp}

This OTP is valid for 5 minutes.

Please do not share this code with anyone for security reasons.

If you did not request this, please ignore this email.

Thanks & Regards,  
Lakshy Trendzz Team 🛍️
`
    });

    res.json({ message: "OTP sent to email 📩" });

  } catch (error) {
    console.error("OTP ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};


// ✅ Verify OTP
exports.verifyEmailOTP = async (req, res) => {
  try {
    const email = req.body.email.trim().toLowerCase();
    const enteredOtp = String(req.body.otp).trim();

    const user = await User.findOne({ email });

    if (!user) {
      console.log("User not found:", email);
      return res.status(404).json({ message: "User not found ❌" });
    }

    const dbOtp = String(user.otp).trim();

    console.log("Entered OTP:", enteredOtp);
    console.log("DB OTP:", dbOtp);

    if (dbOtp !== enteredOtp) {
      console.log("OTP mismatch for:", email);
      return res.status(400).json({ message: "Invalid OTP ❌" });
    }

    if (!user.otpExpire || new Date(user.otpExpire) < new Date()) {
      console.log("OTP expired for:", email);
      return res.status(400).json({ message: "OTP expired ⏳" });
    }

    // 🔐 clear OTP
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login successful 🔥",
      token,
      user
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};