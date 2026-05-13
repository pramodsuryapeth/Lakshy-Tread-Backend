const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const sendEmail = require("../config/mail");
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

    const deliveryCharge = deliveryType === "delivery" ? 60 : 0;
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

    for (const item of parsedOrderData.items) {

  // 🔍 PRODUCT FIND
  const product = await Product.findById(item.productId);

  if (!product) {
    return res.status(404).json({
      message: "Product not found ❌"
    });
  }

  // 🔍 VARIANT FIND
  const variant = product.variants.id(item.variantId);

  if (!variant) {
    return res.status(404).json({
      message: "Variant not found ❌"
    });
  }

  // ❌ STOCK CHECK
  if (variant.stock < item.quantity) {
    return res.status(400).json({
      message: `${product.name} is out of stock ❌`
    });
  }

  // ➖ REDUCE STOCK
  variant.stock -= item.quantity;

  await product.save();
}

    // 🧹 CLEAR CART
    if (parsedOrderData?.clearCart && req.user?.userId) {
      const cart = await Cart.findOne({ userId: req.user.userId });
      if (cart) {
        cart.items = [];
        await cart.save();
      }
    }

  
await sendEmail(
  parsedOrderData?.user?.email,

  `Order Confirmed #${newOrderId}`,

  `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
    <style>
      /* Reset & base */
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      body { margin:0; padding:0; width:100%; }
      img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
      table { border-collapse:collapse; }

      /* Mobile responsive */
      @media only screen and (max-width: 600px) {
        .email-container { width:100% !important; border-radius:0 !important; }
        .email-header { padding:20px !important; }
        .email-header h1 { font-size:22px !important; }
        .email-body { padding:20px !important; }
        .product-table td { display:block !important; width:100% !important; }
        .product-img { width:100% !important; height:auto !important; max-width:200px !important; margin:0 auto 15px !important; display:block !important; }
        .product-info { text-align:center !important; }
        .order-details-col { display:block !important; width:100% !important; margin-bottom:15px; }
        .image-gallery img { width:70px !important; height:70px !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background:#f4f4f4; font-family:Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
      <tr>
        <td align="center" style="padding:30px 10px;">
          <!-- Main Container -->
          <table role="presentation" width="100%" style="max-width:700px; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 5px 20px rgba(0,0,0,0.08);" class="email-container">
            
            <!-- HEADER -->
            <tr>
              <td style="background:#111827; padding:30px; text-align:center;" class="email-header">
                <h1 style="margin:0; font-size:28px; color:#ffffff; font-weight:bold;">Kalakar Prints Studio 🛍️</h1>
                <p style="margin-top:10px; color:#d1d5db; font-size:14px;">Order Confirmation</p>
              </td>
            </tr>

            <!-- BODY -->
            <tr>
              <td style="padding:30px;" class="email-body">
                <h2 style="color:#16a34a; margin-top:0;">Order Successfully Placed ✅</h2>
                <p style="font-size:16px; color:#374151;">
                  Hello <strong>${parsedOrderData?.user?.name}</strong>,
                </p>
                <p style="color:#4b5563; line-height:1.7;">
                  Thank you for shopping with us ❤️ Your payment was received successfully and your order is now confirmed.
                </p>

                <!-- ORDER INFO -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb; border-radius:12px; margin-top:25px;">
                  <tr>
                    <td style="padding:20px;">
                      <h3 style="margin-top:0; color:#111827;">Order Details</h3>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:8px 0; color:#6b7280;">Order ID</td>
                          <td style="padding:8px 0; font-weight:bold; color:#111827;">#${newOrderId}</td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0; color:#6b7280;">Payment ID</td>
                          <td style="padding:8px 0; color:#111827;">${razorpay_payment_id}</td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0; color:#6b7280;">Total Amount</td>
                          <td style="padding:8px 0; font-weight:bold; color:#16a34a;">₹${parsedOrderData?.charges?.finalAmount}</td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0; color:#6b7280;">Delivery Type</td>
                          <td style="padding:8px 0; color:#111827;">${parsedOrderData?.deliveryType}</td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0; color:#6b7280;">Status</td>
                          <td style="padding:8px 0; color:#2563eb; font-weight:bold;">RECEIVED</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- SHIPPING -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb; border-radius:12px; margin-top:25px;">
                  <tr>
                    <td style="padding:20px;">
                      <h3 style="margin-top:0; color:#111827;">Shipping Address</h3>
                      <p style="margin:0; line-height:1.8; color:#374151;">
                        ${parsedOrderData?.user?.name}<br/>
                        ${parsedOrderData?.user?.addressLine}<br/>
                        ${parsedOrderData?.user?.city}, ${parsedOrderData?.user?.state} - ${parsedOrderData?.user?.pincode}<br/>
                        Phone: ${parsedOrderData?.user?.phone}
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- ITEMS -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:30px;">
                  <tr>
                    <td>
                      <h2 style="color:#111827; margin-bottom:20px;">Ordered Items</h2>
                      ${parsedOrderData.items.map((item) => `
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb; border-radius:14px; margin-bottom:25px;">
                          <tr>
                            <td style="padding:20px;">
                              <!-- PRODUCT -->
                              <table width="100%" cellpadding="0" cellspacing="0" class="product-table">
                                <tr>
                                  <td style="vertical-align:top; padding-right:18px;" class="product-img-cell">
                                    <img
                                      src="${item.image}"
                                      alt="${item.name}"
                                      style="width:110px; height:110px; object-fit:cover; border-radius:12px; border:1px solid #e5e7eb;"
                                      class="product-img"
                                    />
                                  </td>
                                  <td style="vertical-align:top; flex:1;" class="product-info">
                                    <h3 style="margin-top:0; margin-bottom:10px; color:#111827;">${item.name}</h3>
                                    <p style="margin:6px 0; color:#4b5563;"><strong>Price:</strong> ₹${item.price}</p>
                                    <p style="margin:6px 0; color:#4b5563;"><strong>Quantity:</strong> ${item.quantity}</p>
                                    ${item.size ? `<p style="margin:6px 0; color:#4b5563;"><strong>Size:</strong> ${item.size}</p>` : ""}
                                    ${item.color ? `<p style="margin:6px 0; color:#4b5563;"><strong>Color:</strong> ${item.color}</p>` : ""}
                                  </td>
                                </tr>
                              </table>

                              ${item.note ? `
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px; background:#f9fafb; border-radius:10px;">
                                  <tr>
                                    <td style="padding:14px;">
                                      <p style="margin:0 0 8px 0; font-weight:bold; color:#111827;">Customer Note</p>
                                      <p style="margin:0; color:#4b5563; line-height:1.7;">${item.note}</p>
                                    </td>
                                  </tr>
                                </table>
                              ` : ""}

                              ${item.uploadedImages?.length ? `
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                                  <tr>
                                    <td>
                                      <h4 style="margin-bottom:12px; color:#111827;">Uploaded Images</h4>
                                      <div style="display:flex; flex-wrap:wrap; gap:10px;" class="image-gallery">
                                        ${item.uploadedImages.map(img => `
                                          <img src="${img}" alt="uploaded" style="width:90px; height:90px; object-fit:cover; border-radius:10px; border:1px solid #d1d5db;"/>
                                        `).join("")}
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                              ` : ""}

                              ${item.designImage?.length ? `
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                                  <tr>
                                    <td>
                                      <h4 style="margin-bottom:12px; color:#111827;">Design Images</h4>
                                      <div style="display:flex; flex-wrap:wrap; gap:10px;" class="image-gallery">
                                        ${item.designImage.map(img => `
                                          <img src="${img}" alt="design" style="width:90px; height:90px; object-fit:cover; border-radius:10px; border:1px solid #d1d5db;"/>
                                        `).join("")}
                                      </div>
                                    </td>
                                  </tr>
                                </table>
                              ` : ""}
                            </td>
                          </tr>
                        </table>
                      `).join("")}
                    </td>
                  </tr>
                </table>

                <!-- FOOTER with Contact -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:30px; padding-top:20px; border-top:1px solid #e5e7eb;">
                  <tr>
                    <td style="padding:20px 0 0 0;">
                      <p style="color:#6b7280; line-height:1.7; font-size:14px; margin:0;">
                        For any help regarding your order, feel free to reach us on WhatsApp:
                      </p>
                      <p style="margin-top:10px; font-size:18px; font-weight:bold; color:#111827;">
                        <a href="https://wa.me/8380854418" target="_blank" style="color:#25D366; text-decoration:none; background:#e8f5e9; padding:6px 14px; border-radius:8px; display:inline-block;">
                          💬 +91 8380854418
                        </a>
                      </p>
                      <p style="margin-top:20px; color:#111827; font-weight:bold;">
                        Regards,<br/>
                        Kalakar Prints Studio 🛍️
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `
);


    res.json({
      message: "Payment success ✅",
      order
    });

    

  } catch (err) {
    console.error("🔥 VERIFY ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};