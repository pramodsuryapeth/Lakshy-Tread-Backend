const express = require("express");
const router = express.Router();

const { verifyUser } = require("../middleware/auth.middleware");

const {
  createOrder,
  paymentSuccess
} = require("../controllers/payment.controller");

// 🧾 Create Razorpay order
router.post("/create", verifyUser, createOrder);

// ✅ Payment success
router.post("/success", verifyUser, paymentSuccess);

module.exports = router;