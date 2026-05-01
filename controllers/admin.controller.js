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

    const newOrders = await Order.countDocuments({
      status: "pending",
    });

    const completedOrders = await Order.countDocuments({
      status: "completed",
    });

    const revenueData = await Order.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
        },
      },
    ]);

    const revenue = revenueData[0]?.total || 0;

    res.json({
      totalProducts,
      totalOrders,
      newOrders,
      completedOrders,
      revenue,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};