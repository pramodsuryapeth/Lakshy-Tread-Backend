const express = require('express');
const app = express();
const connectdb = require('./config/db');
require("dotenv").config();

connectdb();

const otpRoutes = require("./routes/otp.routes");
const authRoutes = require("./routes/auth.routes");

app.use("/api/otp", otpRoutes);
app.use("/api/auth", authRoutes);


app.listen(3000);
