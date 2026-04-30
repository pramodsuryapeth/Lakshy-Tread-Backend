const User = require("../models/Users");
const nodemailer = require("nodemailer");
const redisClient = require("../config/redis");
const jwt = require("jsonwebtoken");

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
        new: true,      // updated user परत मिळेल
        upsert: true    // user नसेल तर create होईल
      }
    );

    console.log("OTP saved for:", email);
    console.log("OTP:", user.otp);

    // 📧 send email (optional)
    /*
    await transporter.sendMail({
      to: email,
      subject: "OTP",
      text: `Your OTP is ${otp}`
    });
    */

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

    // ✅ FIX 1: Proper return
    if (!user) {
      console.log("User not found:", email);
      return res.status(404).json({ message: "User not found ❌" });
    }

    const dbOtp = String(user.otp).trim();

    console.log("Entered OTP:", enteredOtp);
    console.log("DB OTP:", dbOtp);

    // ✅ FIX 2: OTP check
    if (dbOtp !== enteredOtp) {
      console.log("OTP mismatch for:", email);
      return res.status(400).json({ message: "Invalid OTP ❌" });
    }

    // ✅ FIX 3: Expiry check
    if (!user.otpExpire || new Date(user.otpExpire) < new Date()) {
      console.log("OTP expired for:", email);
      return res.status(400).json({ message: "OTP expired ⏳" });
    }

    // 🔐 clear OTP
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email,  role: "user"  },
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