const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({

  orderId: {
    type: Number,
    unique: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  user: {
    name: String,
    email: String,
    phone: String,
    address: String,
    pincode: String,
    city: String,
    state: String,
  },

  // 🔥 ADD THIS (MAIN FIX)
  uploadedImages: {
    type: [String],
    default: []
  },

  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      },

      name: String,
      size: String,
      color: String,
      price: Number,
      quantity: Number,
      image: String,

      designImage: [String],

      // optional (keep or remove later)
      uploadedImages: [String],

      note: String
    }
  ],

  deliveryType: {
    type: String,
    enum: ["delivery", "pickup"],
    required: true
  },

  charges: {
    productTotal: Number,
    deliveryCharge: Number,
    gst: Number,
    finalAmount: Number
  },

  payment: {
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending"
    },
    paymentId: String
  },

  status: {
    type: String,
    enum: ["received", "confirmed", "ready", "dispatched", "delivered"],
    default: "received"
  }

}, { timestamps: true });

// indexes
orderSchema.index({ status: 1 });
orderSchema.index({ deliveryType: 1 });

module.exports = mongoose.model("Order", orderSchema);