const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: {
    name: String,
    email: String,
    phone: String,
    address: String,
    pincode: String
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

      image: String, // product image

      // 🔥 customize design (optional)
      designImage: String,

      // 🔥 buy-time uploaded images (optional multiple)
      uploadedImages: [String],

      // 🔥 user note (optional)
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
  },

  // 🔥 extra timestamps (readable)
  createdDate: {
    type: String
  },
  createdTime: {
    type: String
  }

}, { timestamps: true });

// indexes
orderSchema.index({ status: 1 });
orderSchema.index({ deliveryType: 1 });

module.exports = mongoose.model("Order", orderSchema);