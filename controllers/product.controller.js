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
      images: req.imageUrls || []
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

    product.name = name || product.name;
    product.description = description || product.description;

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
    const { productId, sizes, size, price, stock, color } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found ❌" });
    }

    let newSizes = [];
    let newColor = [];

    if (sizes) {
      try {
        newSizes = JSON.parse(sizes);
      } catch {
        newSizes = [];
      }
    } else if (size) {
      newSizes = size.split(",");
    }

   if (color) {
  try {
    newColor = JSON.parse(color);   // if it's JSON (["red","blue"])
  } catch (err) {
    // if not JSON → treat as comma-separated string
    if (color.includes(",")) {
      newColor = color.split(",");
    } else {
      newColor = [color]; // single value
    }
  }
}
    product.variants.push({
      size: newSizes[0] || "",
      sizes: newSizes,
      color: newColor,
      price,
      stock,
      images: req.imageUrls || []
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
    const { productId, variantId, size, sizes, price, stock, color } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found ❌" });
    }

    const variant = product.variants.id(variantId);

    if (!variant) {
      return res.status(404).json({ message: "Variant not found ❌" });
    }

    let finalSizes = [];

    if (sizes && Array.isArray(sizes)) {
      finalSizes = sizes;
    } else if (size) {
      finalSizes = [size];
    }

    const exists = product.variants.find(
      (v) =>
        v.color === (color || variant.color) &&
        JSON.stringify(v.sizes || []) === JSON.stringify(finalSizes) &&
        v._id.toString() !== variantId
    );

    if (exists) {
      return res.status(400).json({ message: "Variant already exists ❌" });
    }

    if (finalSizes.length > 0) {
      variant.sizes = finalSizes;
      variant.size = finalSizes[0];
    }

    variant.color = color || variant.color;
    variant.price = price || variant.price;
    variant.stock = stock || variant.stock;

    if (req.imageUrls) {
      variant.images = req.imageUrls;
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
    const { variantId } = req.params;

    const product = await Product.findOneAndUpdate(
      { "variants._id": variantId },
      { $pull: { variants: { _id: variantId } } },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found ❌" });
    }

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
    console.error("❌ MAIN ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
};

exports.getVariants = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product.variants);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};