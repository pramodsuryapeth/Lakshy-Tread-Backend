const axios = require("axios");

const sendEmail = async (to, subject, html) => {
  try {
    const res = await axios.post(
      "https://api.sendinblue.com/v3/smtp/email",
      {
        sender: {
          name: "Lakshy Trendzz 🛍️",
          email: process.env.EMAIL_USER,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          "api-key": process.env.EMAIL_PASS,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Email sent:", res.data.messageId);
  } catch (error) {
    console.error("❌ Email error:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = sendEmail;