const express = require("express");
const router = express.Router();

const {
  sendEmailOTP,
  verifyEmailOTP
} = require("../controllers/otp.controller");

router.post("/send-otp", sendEmailOTP);
router.post("/verify-otp", verifyEmailOTP);

module.exports = router;