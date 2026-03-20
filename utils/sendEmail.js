const transporter = require("../config/mail");

exports.sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER, // tuzha email
      to: to,
      subject: subject,
      text: text
    });

    console.log("Email sent to:", to);

  } catch (error) {
    console.log("Email error:", error);
  }
};