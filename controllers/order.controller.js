const Cart = require("../models/Cart");
const Order = require("../models/Order");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");


// 🛒 CHECKOUT
exports.checkout = async (req, res) => {
  try {
    let {
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

    const userId = req.user?.userId || null;

    // 🛡 defaults
    name = name || "";
    email = email || "";
    phone = phone || "";
    address = address || "";
    state = state || "";
    city = city || "";
    pincode = pincode || "";
    deliveryType = deliveryType || "pickup";

    // 🧠 parse items
    let parsedItems = [];
    try {
      parsedItems =
        typeof items === "string" ? JSON.parse(items) : items || [];
    } catch {
      parsedItems = [];
    }

    if (!parsedItems.length) {
      return res.status(400).json({ message: "No items ❌" });
    }

    // 🔥 ORDER ID GENERATE (SAFE)
    const lastOrder = await Order.findOne({ orderId: { $exists: true } })
      .sort({ orderId: -1 });

    const newOrderId =
      lastOrder && typeof lastOrder.orderId === "number"
        ? lastOrder.orderId + 1
        : 1;

    console.log("NEW ORDER ID 👉", newOrderId);

    // 📸 uploaded images
    const uploadedImagesFromBackend =
      req.files?.map(file => file.path) || [];

    // 💰 totals
    let productTotal = 0;
    parsedItems.forEach(item => {
      productTotal += (item.price || 0) * (item.quantity || 1);
    });

    const deliveryCharge = deliveryType === "delivery" ? 50 : 0;
    const gst = productTotal * 0.18;
    const finalAmount = productTotal + deliveryCharge + gst;

    const order = new Order({
      orderId: newOrderId, // ✅ IMPORTANT

      userId,

      user: {
        name,
        email,
        phone,
        address,
        state,
        city,
        pincode
      },

      items: parsedItems.map(item => ({
        productId: item.productId || null,
        name: item.name || "",

        // ✅ FIX ARRAY ISSUE
        size: Array.isArray(item.size)
          ? item.size[0] || ""
          : item.size || "",

        color: Array.isArray(item.color)
          ? item.color[0] || ""
          : item.color || "",

        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        image: item.image || "",

        // ✅ always array
        designImage: Array.isArray(item.designImage)
          ? item.designImage
          : item.designImage
          ? [item.designImage]
          : [],

        uploadedImages:
          item.uploadedImages?.length
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

    // 🧹 clear cart
    if (userId) {
      const cart = await Cart.findOne({ userId });
      if (cart) {
        cart.items = [];
        await cart.save();
      }
    }

    res.json({
      message: "Order created 💳",
      order
    });

  } catch (err) {
    console.error("🔥 CHECKOUT ERROR:", err);
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

      // ✅ IMPORTANT FIX
      uploadedImages: order.uploadedImages || [],

      items: order.items.map(item => ({
        ...item,
        designImage: item.designImage || null,
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

      // ✅ IMPORTANT FIX
      uploadedImages: order.uploadedImages || [],

      items: order.items.map(item => ({
        ...item,
        designImage: item.designImage || null,
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

      // ✅ IMPORTANT FIX
      uploadedImages: order.uploadedImages || [],

      items: order.items.map(item => ({
        ...item,
        designImage: item.designImage || null,
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
    console.log("🔥 HIT UPDATE API");
    const { orderId, status } = req.body;
     console.log("BODY 👉", req.body); 

    const validStatus = [
      "received",
      "confirmed",
      "ready",
      "dispatched",
      "delivered",
    ];

    if (!validStatus.includes(status)) {
      return res.status(400).json({ message: "Invalid status ❌" });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found ❌" });
    }

    order.status = status;

    await order.save();

    res.json({ message: "Status updated ✅", order });

  } catch (err) {
    console.log("Status update error:", err);
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

    console.log("💰 Amount received:", amount);

    // 🔥 strict validation
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ message: "Invalid amount ❌" });
    }

    const finalAmount = Math.round(Number(amount) * 100);

    console.log("💰 Final (paise):", finalAmount);

    const order = await razorpay.orders.create({
      amount: finalAmount,
      currency: "INR",
      receipt: "rcpt_" + Date.now(),
    });

    res.json(order);

  } catch (err) {
    console.error("🔥 Razorpay FULL ERROR:", err); // 👈 important
    res.status(500).json({
      message: err?.error?.description || err.message || "Razorpay failed"
    });
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

    // ❌ PAYMENT DATA CHECK
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment details ❌" });
    }

    // 🔐 VERIFY SIGNATURE
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed ❌" });
    }

    // 🔥 PARSE ORDER DATA (multipart fix)
    const parsedOrderData =
      typeof orderData === "string" ? JSON.parse(orderData) : orderData;

    if (!parsedOrderData || !Array.isArray(parsedOrderData.items)) {
      return res.status(400).json({ message: "Invalid order data ❌" });
    }

    // 🔢 ORDER ID GENERATION
    const lastOrder = await Order.findOne({
      orderId: { $exists: true, $ne: null }
    }).sort({ orderId: -1 });

    const newOrderId =
      lastOrder && typeof lastOrder.orderId === "number"
        ? lastOrder.orderId + 1
        : 1;

    console.log("✅ NEW ORDER ID 👉", newOrderId);

    // 🔥 FINAL FILE FIX (MOST IMPORTANT)
    const uploadedImages =
      parsedOrderData?.uploadedFiles || req.imageUrls || [];

    console.log("📂 Uploaded Images 👉", uploadedImages);

    // 🧾 CREATE ORDER
    const order = new Order({
      orderId: newOrderId,

      userId: req.user?.userId || null,

      user: {
        name: parsedOrderData?.user?.name || "",
        email: parsedOrderData?.user?.email || "",
        phone: parsedOrderData?.user?.phone || "",
        address: parsedOrderData?.user?.addressLine || "",
        city: parsedOrderData?.user?.city || "",
        state: parsedOrderData?.user?.state || "",
        pincode: parsedOrderData?.user?.pincode || ""
      },

      // 🔥 MOVE IMAGES TO TOP LEVEL (BEST PRACTICE)
      uploadedImages,

      items: parsedOrderData.items.map(item => ({
        productId: item?.productId || null,
        name: item?.name || "",

        size: Array.isArray(item?.size)
          ? item.size[0] || ""
          : item?.size || "",

        color: Array.isArray(item?.color)
          ? item.color[0] || ""
          : item?.color || "",

        price: Number(item?.price) || 0,
        quantity: Number(item?.quantity) || 1,
        image: item?.image || "",

        designImage: Array.isArray(item?.designImage)
          ? item.designImage
          : item?.designImage
          ? [item.designImage]
          : [],

        note: item?.note || parsedOrderData?.note || ""
      })),

      deliveryType: parsedOrderData?.deliveryType || "pickup",

      charges: {
        productTotal: parsedOrderData?.charges?.productTotal || 0,
        deliveryCharge: parsedOrderData?.charges?.deliveryCharge || 0,
        gst: parsedOrderData?.charges?.gst || 0,
        finalAmount: parsedOrderData?.charges?.finalAmount || 0
      },

      payment: {
        status: "paid",
        paymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id
      },

      status: "received",
      createdAt: new Date()
    });

    await order.save();

    // 🧹 CLEAR CART
    if (parsedOrderData?.clearCart && req.user?.userId) {
      const cart = await Cart.findOne({ userId: req.user.userId });
      if (cart) {
        cart.items = [];
        await cart.save();
      }
    }

    res.json({
      message: "Payment success ✅",
      order
    });

  } catch (err) {
    console.error("🔥 VERIFY ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};