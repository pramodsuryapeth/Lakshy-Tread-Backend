const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      },

      variantId: String,
      name: String,
      size: String,
      color: String,
      price: Number,
      quantity: Number,
      image: String
    }
  ]

}, { timestamps: true });

module.exports = mongoose.model("Cart", cartSchema);