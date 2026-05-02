const nodemailer = require("nodemailer");
const dns = require("dns");

// 🔥 Force IPv4 (Render issue fix)
dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,        // 🔥 IMPORTANT
  secure: false,    // 🔥 IMPORTANT
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

module.exports = transporter;