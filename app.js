const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");

const connectdb = require("./config/db");

// 🔗 DB connect
connectdb();

// 🔥 MIDDLEWARES
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ❌ NO local uploads (Cloudinary use karto)

// 🔗 ROUTES
const otpRoutes = require("./routes/otp.routes");
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");

app.use("/api/otp", otpRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cart", require("./routes/cart.routes"));
app.use("/api/order", require("./routes/order.routes"));
app.use("/api/payment", require("./routes/payment"));
app.use("/api/product", require("./routes/product.routes"));
// app.use("/api/user", require("./routes/user.routes"));

// 🧪 TEST ROUTE
app.get("/", (req, res) => {
  res.send("Lakshy Trendzz API running 🚀");
});

// 🚀 SERVER START
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🔥`);
});