const Cart = require("../models/Cart");
const Order = require("../models/Order");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");
const redisClient = require("../config/redis");


// 🛒 CHECKOUT
exports.checkout = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      pincode,
      deliveryType,
      items // 🔥 frontend कडून येणार (with images + note)
    } = req.body;

    const userId = req.user.userId;

    // ❌ cart empty check (only if cart flow)
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items to order ❌" });
    }

    // 💰 Calculate totals
    let productTotal = 0;

    items.forEach(item => {
      productTotal += item.price * item.quantity;
    });

    const deliveryCharge = deliveryType === "delivery" ? 50 : 0;
    const gst = productTotal * 1;
    const finalAmount = productTotal + deliveryCharge + gst;

    // 🕒 Date & Time
    const now = new Date();

    // 📦 Create Order
    const order = new Order({
      userId,

      user: { name, email, phone, address, pincode },

      items: items.map(item => ({
        productId: item.productId,
        name: item.name,
        size: item.size,
        color: item.color,
        price: item.price,
        quantity: item.quantity,
        image: item.image,

        // 🔥 NEW FIELDS
        designImage: item.designImage || null,
        uploadedImages: item.uploadedImages || [],
        note: item.note || ""
      })),

      deliveryType,

      charges: { productTotal, deliveryCharge, gst, finalAmount },

      payment: { status: "pending" },

      status: "received",

      createdDate: now.toLocaleDateString(),
      createdTime: now.toLocaleTimeString()
    });

    await order.save();

    // 🧹 Clear cart ONLY if cart flow
    const cart = await Cart.findOne({ userId });

    if (cart) {
      cart.items = [];
      await cart.save();
      await redisClient.del(`cart:${userId}`);
    }

    // 🧠 Cache clear
    await redisClient.del(`orders:user:${userId}`);
    await redisClient.del("orders:all");
    await redisClient.del("revenue");

    res.json({ message: "Order created 💳", order });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// 👤 USER ORDERS
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 🔥 Redis first
    const cacheKey = `orders:user:${userId}`;
    const cachedOrders = await redisClient.get(cacheKey);

    if (cachedOrders) {
      return res.json(JSON.parse(cachedOrders));
    }

    const orders = await Order.find({ userId })
      .populate("items.productId")
      .sort({ createdAt: -1 })
      .lean(); // 🔥 important for performance

    // 🔥 optional: clean response (avoid null noise)
    const formattedOrders = orders.map(order => ({
      ...order,
      items: order.items.map(item => ({
        ...item,
        designImage: item.designImage || null,
        uploadedImages: item.uploadedImages || [],
        note: item.note || ""
      }))
    }));

    // 🧠 Cache for 5 min
    await redisClient.set(
      cacheKey,
      JSON.stringify(formattedOrders),
      { EX: 60 * 5 }
    );

    res.json(formattedOrders);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// 🧑‍💼 ADMIN - ALL ORDERS
exports.getAllOrders = async (req, res) => {
  try {
    const cacheKey = "orders:all";

    // 🔥 Redis first
    const cachedOrders = await redisClient.get(cacheKey);

    if (cachedOrders) {
      return res.json(JSON.parse(cachedOrders));
    }

    const orders = await Order.find()
      .populate("items.productId", "name price image") // 🔥 only needed fields
      .sort({ createdAt: -1 })
      .lean(); // 🔥 performance boost

    // 🔥 clean response
    const formattedOrders = orders.map(order => ({
      ...order,
      items: order.items.map(item => ({
        ...item,
        designImage: item.designImage || null,
        uploadedImages: item.uploadedImages || [],
        note: item.note || ""
      }))
    }));

    // 🧠 Cache for 5 min
    await redisClient.set(
      cacheKey,
      JSON.stringify(formattedOrders),
      { EX: 60 * 5 }
    );

    res.json(formattedOrders);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("items.productId", "name price image") // 🔥 only needed fields
      .lean(); // 🔥 faster

    if (!order) {
      return res.status(404).json({ message: "Order not found ❌" });
    }

    // 🔥 clean response
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

    // 🧠 Clear caches
    await redisClient.del(`orders:user:${order.userId}`);
    await redisClient.del("orders:all");
    await redisClient.del("revenue");

    res.json(order);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// 💰 REVENUE
exports.getRevenue = async (req, res) => {
  try {
    const cacheKey = "revenue";

    // 🔥 Redis first
    const cachedRevenue = await redisClient.get(cacheKey);

    if (cachedRevenue) {
      return res.json({ revenue: Number(cachedRevenue) });
    }

    // 🔥 Aggregation (fast)
    const result = await Order.aggregate([
      { $match: { status: "delivered" } }, // 🔥 correct status
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$charges.finalAmount" }
        }
      }
    ]);

    const revenue = result[0]?.totalRevenue || 0;

    // 🧠 Cache
    await redisClient.set(cacheKey, revenue, { EX: 60 * 5 });

    res.json({ revenue });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100, // paisa
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

    // ✅ SAVE ORDER
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