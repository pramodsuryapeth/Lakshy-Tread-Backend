const Cart = require("../models/Cart");
const Order = require("../models/Order");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");


// 🛒 CHECKOUT
exports.checkout = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      state,
      city,
      pincode,
      deliveryType,
      items
    } = req.body;

    const userId = req.user.userId;

    let parsedItems = items;
    if (typeof items === "string") {
      parsedItems = JSON.parse(items);
    }

    if (!parsedItems || parsedItems.length === 0) {
      return res.status(400).json({ message: "No items to order ❌" });
    }

    const uploadedImagesFromBackend =
      req.files?.map(file => file.path) || [];

    let productTotal = 0;

    parsedItems.forEach(item => {
      productTotal += item.price * item.quantity;
    });

    const deliveryCharge = deliveryType === "delivery" ? 50 : 0;
    const gst = productTotal * 0.18;
    const finalAmount = productTotal + deliveryCharge + gst;

    const order = new Order({
      userId,
      user: { name, email, phone, address, state, city, pincode },

      items: parsedItems.map(item => ({
        productId: item.productId,
        name: item.name,
        size: item.size,
        color: item.color,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        designImage: item.designImage || null,
        uploadedImages:
          item.uploadedImages?.length > 0
            ? item.uploadedImages
            : uploadedImagesFromBackend,
        note: item.note || ""
      })),

      deliveryType,

      charges: {
        productTotal,
        deliveryCharge,
        gst,
        finalAmount
      },

      payment: { status: "pending" },
      status: "received",
      createdAt: new Date()
    });

    await order.save();

    // 🧹 Clear cart (DB only)
    const cart = await Cart.findOne({ userId });

    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.json({
      message: "Order created 💳",
      order
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// 👤 USER ORDERS
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.userId;

    const orders = await Order.find({ userId })
      .populate("items.productId")
      .sort({ createdAt: -1 })
      .lean();

    const formattedOrders = orders.map(order => ({
      ...order,
      items: order.items.map(item => ({
        ...item,
        designImage: item.designImage || null,
        uploadedImages: item.uploadedImages || [],
        note: item.note || ""
      }))
    }));

    res.json(formattedOrders);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// 🧑‍💼 ADMIN - ALL ORDERS
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("items.productId", "name price image")
      .sort({ createdAt: -1 })
      .lean();

    const formattedOrders = orders.map(order => ({
      ...order,
      items: order.items.map(item => ({
        ...item,
        designImage: item.designImage || null,
        uploadedImages: item.uploadedImages || [],
        note: item.note || ""
      }))
    }));

    res.json(formattedOrders);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("items.productId", "name price image")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found ❌" });
    }

    const formattedOrder = {
      ...order,
      items: order.items.map(item => ({
        ...item,
        designImage: item.designImage || null,
        uploadedImages: item.uploadedImages || [],
        note: item.note || ""
      }))
    };

    res.json(formattedOrder);

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
    const result = await Order.aggregate([
      { $match: { status: "delivered" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$charges.finalAmount" }
        }
      }
    ]);

    const revenue = result[0]?.totalRevenue || 0;

    res.json({ revenue });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// 💳 Razorpay
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "rcpt_" + Date.now(),
    });

    res.json(order);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderData
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ message: "Payment failed ❌" });
    }

    const order = new Order({
      ...orderData,
      payment: {
        status: "paid",
        paymentId: razorpay_payment_id
      }
    });

    await order.save();

    res.json({ message: "Payment success ✅", order });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};