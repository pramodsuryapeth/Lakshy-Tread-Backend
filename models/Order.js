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
      image: String,
      customImage: String 
    }
  ],

  deliveryType: {
    type: String,
    enum: ["delivery", "pickup"]
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
    enum: ["pending", "confirmed", "dispatched", "completed"],
    default: "pending"
  }

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);