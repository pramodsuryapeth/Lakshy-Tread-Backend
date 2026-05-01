const nodemailer = require("nodemailer");
const dns = require("dns");

// 🔥 Force IPv4 (Render issue fix)
dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
  host: "74.125.24.108",
  port: 587,
  secure: false,
  family: 4, // 🔥 FORCE IPv4
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000
});

module.exports = transporter;