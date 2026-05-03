const razorpay = require("../config/razorpay");
const Order = require("../models/Order");

// 🧾 Create Razorpay Order
exports.createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    const options = {
      amount: amount * 100, // ₹ → paisa
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    res.json(order);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ✅ Payment Success
exports.paymentSuccess = async (req, res) => {
  try {
    const { orderId, paymentId } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found ❌" });
    }

    // ✅ update
    order.payment.status = "paid";
    order.payment.paymentId = paymentId;
    order.status = "confirmed";

    await order.save();

    // 🔥 👉 ITH ADD KELAY MAIL
   await sendEmail(
  order.user.email,
  "Lakshy Trendzz | Order Confirmed 🎉",
  `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    
    <h2 style="color: #333;">Hello ${order.user.name} 👋</h2>

    <p>Thank you for shopping with <b>Lakshy Trendzz</b> 🛍️</p>

    <p>Your order has been <b style="color: green;">confirmed successfully</b> 🎉</p>

    <h3>🧾 Order Details:</h3>
    <ul>
      <li><b>Amount:</b> ₹${order.charges.finalAmount}</li>
      <li><b>Status:</b> Confirmed</li>
    </ul>

    <p>You can track your order status anytime by clicking below:</p>

    <a href="http://localhost:3000/orders"
       style="
         display: inline-block;
         padding: 12px 20px;
         background-color: #000;
         color: #fff;
         text-decoration: none;
         border-radius: 5px;
         margin-top: 10px;
       ">
       View Your Order
    </a>

    <p style="margin-top:20px;">
      If you have any questions, feel free to contact us.
    </p>

    <p>
      Thanks & Regards,<br/>
      <b>Lakshy Trendzz Team ❤️</b>
    </p>

  </div>
  `
);

  await sendEmail(
  "pramodsuryapeth828@gmail.com", // 👉 admin email
  "🚨 New Order Received | Lakshy Trendzz",
  `
  <div style="font-family: Arial, sans-serif; padding: 20px;">

    <h2>📦 New Order Alert!</h2>

    <p><b>Customer Name:</b> ${order.user.name}</p>
    <p><b>Email:</b> ${order.user.email}</p>

    <h3>🧾 Order Summary:</h3>
    <ul>
      <li><b>Amount:</b> ₹${order.charges.finalAmount}</li>
      <li><b>Status:</b> Confirmed</li>
    </ul>

    <p>Login to admin panel to process this order.</p>

    <p style="margin-top:20px;">
      — Lakshy Trendzz System 🚀
    </p>

  </div>
  `
);

    res.json({ message: "Payment successful ✅", order });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};