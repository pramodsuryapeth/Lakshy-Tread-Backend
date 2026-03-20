const Cart = require("../models/Cart");
const Order = require("../models/Order");

exports.checkout = async (req, res) => {
  try {
    const { name, email, phone, address, pincode, deliveryType } = req.body;

    const userId = req.user.userId;

    const cart = await Cart.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty ❌" });
    }

    let productTotal = 0;

    cart.items.forEach(item => {
      productTotal += item.price * item.quantity;
    });

    const deliveryCharge = deliveryType === "delivery" ? 50 : 0;
    const gst = productTotal * 0.18;
    const finalAmount = productTotal + deliveryCharge + gst;

    const order = new Order({
      user: { name, email, phone, address, pincode },
      items: cart.items,
      deliveryType,
      charges: { productTotal, deliveryCharge, gst, finalAmount },
      payment: { status: "pending" },
      status: "pending"
    });

    await order.save();

    // clear cart
    cart.items = [];
    await cart.save();

    res.json({ message: "Order created 💳", order });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUserOrders = async (req, res) => {
  const orders = await Order.find({
    "user.email": req.user.email
  }).sort({ createdAt: -1 });

  res.json(orders);
};

exports.getAllOrders = async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

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

exports.getRevenue = async (req, res) => {
  const orders = await Order.find({ status: "completed" });

  const revenue = orders.reduce(
    (sum, o) => sum + o.charges.finalAmount,
    0
  );

  res.json({ revenue });
};