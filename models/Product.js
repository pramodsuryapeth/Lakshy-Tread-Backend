const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  size: String,
  price: Number,
  color:String,
  image:String,
  stock: Number
});

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  image: String,
  fabric: String,
  variants: [variantSchema]
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);