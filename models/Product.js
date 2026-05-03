const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  size: String, // 👈 existing (single size, keep it)

  // 🔥 NEW: multiple sizes support
  sizes: [String], // ["S", "M", "L"]

  price: Number,
  color: [String],

  // 🔥 multiple images
  images: [String],

  stock: Number
});

const productSchema = new mongoose.Schema({
  name: String,
  description: String,

  // 🔥 multiple images
  images: [String],

  fabric: String,

  variants: [variantSchema]
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);