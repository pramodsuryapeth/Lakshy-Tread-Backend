const Cart = require("../models/Cart");
const Order = require("../models/Order");


// 🛒 CHECKOUT
exports.checkout = async (req, res) => {
  try {
    const { name, email, phone, address, pincode, deliveryType } = req.body;
    const userId = req.user.userId;

    const cart = await Cart.findOne({ userId });

    // ✅ Safety check
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty ❌" });
    }

    // 💰 Calculate totals
    let productTotal = 0;

    cart.items.forEach(item => {
      productTotal += item.price * item.quantity;
    });

    const deliveryCharge = deliveryType === "delivery" ? 50 : 0;
    const gst = productTotal * 0.18;
    const finalAmount = productTotal + deliveryCharge + gst;

    // 📦 Create Order
    const order = new Order({
      userId: userId, // 🔥 IMPORTANT FIX
      user: { name, email, phone, address, pincode },
      items: cart.items, // contains customImage ✔️
      deliveryType,
      charges: { productTotal, deliveryCharge, gst, finalAmount },
      payment: { status: "pending" },
      status: "pending"
    });

    await order.save();

    // 🧹 Clear cart
    cart.items = [];
    await cart.save();

    res.json({ message: "Order created 💳", order });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 👤 USER ORDERS
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.user.userId // 🔥 FIXED
    })
      .populate("items.productId") // optional (good for UI)
      .sort({ createdAt: -1 });

    res.json(orders);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 🧑‍💼 ADMIN - ALL ORDERS
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("items.productId")
      .sort({ createdAt: -1 });

    res.json(orders);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 🔄 UPDATE ORDER STATUS
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    const validStatus = ["pending", "confirmed", "dispatched", "completed"];

    if (!validStatus.includes(status)) {
      return res.status(400).json({ message: "Invalid status ❌" });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found ❌" });
    }

    order.status = status;

    await order.save();

    res.json(order);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 💰 REVENUE
exports.getRevenue = async (req, res) => {
  try {
    const orders = await Order.find({ status: "completed" });

    const revenue = orders.reduce(
      (sum, o) => sum + o.charges.finalAmount,
      0
    );

    res.json({ revenue });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};