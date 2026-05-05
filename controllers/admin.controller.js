const jwt = require("jsonwebtoken");
const Product = require("../models/Product");
const Order = require("../models/Order");

// 🔐 Admin Login (NO Redis)
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // check with env credentials
    if (
      email !== process.env.ADMIN_EMAIL ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({ message: "Invalid credentials ❌" });
    }

    // generate JWT token
    const token = jwt.sign(
      { role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Admin login successful 🔥",
      role: "admin",
      token,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 📊 Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();

    const totalOrders = await Order.countDocuments();

    // 🟡 received = new orders
    const newOrders = await Order.countDocuments({
      status: "delivered",
    });

    // 🟢 delivered = completed
    const completedOrders = await Order.countDocuments({
      status: "delivered",
    });

    // 💰 revenue (received orders)
    const revenueData = await Order.aggregate([
      { $match: { status: "delivered" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$charges.finalAmount" },
        },
      },
    ]);

    const revenue = revenueData[0]?.total || 0;

    // =========================
    // 🔥 ✅ TODAY RECENT ORDERS
    // =========================
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const recentOrders = await Order.find({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    })
      .sort({ createdAt: -1 }) // latest first
      .limit(5); // top 5 orders

    // =========================

    res.json({
      totalProducts,
      totalOrders,
      newOrders,
      completedOrders,
      revenue,
      recentOrders, // 🔥 IMPORTANT
    });

  } catch (err) {
    console.log("Dashboard Error:", err);
    res.status(500).json({ message: err.message });
  }
};