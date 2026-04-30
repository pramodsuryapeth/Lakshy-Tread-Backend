const express = require("express");
const router = express.Router();

const { verifyUser, verifyAdmin } = require("../middleware/auth.middleware");

const {
  checkout,
  getUserOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getRevenue,
  createRazorpayOrder,
  verifyPayment
} = require("../controllers/order.controller");

// 👤 USER
router.post("/checkout", verifyUser, checkout);
router.get("/my", verifyUser, getUserOrders);

// 🧑‍💼 ADMIN
router.get("/all", verifyAdmin, getAllOrders);
router.get("/:orderId", verifyAdmin, getOrderById);
router.put("/status", verifyAdmin, updateOrderStatus);
router.get("/revenue", verifyAdmin, getRevenue);

// Razorpay 
router.post("/razorpay-order", verifyUser, createRazorpayOrder);

router.post("/verify-payment", verifyUser, verifyPayment);


module.exports = router;