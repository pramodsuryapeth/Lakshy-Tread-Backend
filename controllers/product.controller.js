const Product = require("../models/Product");

// =====================
// ➕ ADD PRODUCT
// =====================
exports.addProduct = async (req, res) => {
  try {
    const { name, description } = req.body;

    const product = new Product({
      name,
      description,
      image: req.imageUrl || ""
    });

    await product.save();

    res.json(product);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =====================
// ✏ UPDATE PRODUCT
// =====================
exports.updateProduct = async (req, res) => {
  try {
    const { productId, name, description } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found ❌" });
    }

    // update fields
    product.name = name || product.name;
    product.description = description || product.description;

    // only update image if new uploaded
    if (req.imageUrl) {
      product.image = req.imageUrl;
    }

    await product.save();

    res.json(product);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =====================
// ❌ DELETE PRODUCT
// =====================
exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found ❌" });
    }

    await Product.findByIdAndDelete(productId);

    res.json({ message: "Product deleted ✅" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =====================
// ➕ ADD VARIANT
// =====================
exports.addVariant = async (req, res) => {
  try {
    const { productId, size, price, stock, color } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found ❌" });
    }

    // ❗ duplicate check (size + color)
    const exists = product.variants.find(
      v => v.size === size && v.color === color
    );

    if (exists) {
      return res.status(400).json({ message: "Variant already exists ❌" });
    }

    product.variants.push({
      size,
      color,
      price,
      stock,
      image: req.imageUrl || ""
    });

    await product.save();

    res.json(product);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =====================
// ✏ UPDATE VARIANT
// =====================
exports.updateVariant = async (req, res) => {
  try {
    const { productId, variantId, size, price, stock, color } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found ❌" });
    }

    const variant = product.variants.id(variantId);

    if (!variant) {
      return res.status(404).json({ message: "Variant not found ❌" });
    }

    // ❗ duplicate check (exclude current)
    const exists = product.variants.find(
      v =>
        v.size === size &&
        v.color === color &&
        v._id.toString() !== variantId
    );

    if (exists) {
      return res.status(400).json({ message: "Variant already exists ❌" });
    }

    // update fields
    variant.size = size || variant.size;
    variant.color = color || variant.color;
    variant.price = price || variant.price;
    variant.stock = stock || variant.stock;

    // only update image if new uploaded
    if (req.imageUrl) {
      variant.image = req.imageUrl;
    }

    await product.save();

    res.json(product);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =====================
// ❌ DELETE VARIANT
// =====================
exports.deleteVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found ❌" });
    }

    product.variants = product.variants.filter(
      v => v._id.toString() !== variantId
    );

    await product.save();

    res.json(product);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =====================
// 📦 GET ALL PRODUCTS
// =====================
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};