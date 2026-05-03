const nodemailer = require("nodemailer");
const dns = require("dns");

// 🔥 Force IPv4 (Render issue fix)
dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,  // 👈 use THIS login
    pass: process.env.EMAIL_PASS,              // 👈 your Brevo API key
  },
});

module.exports = transporter;