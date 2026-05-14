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
    const { productId, sizes, size, price, stock, colors } = req.body;

    console.log("ADD VARIANT REQ BODY:", req.body);

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found ❌" });
    }

    let newSizes = [];
    let newColor = [];

    // Parse sizes
    if (sizes) {
      try {
        newSizes = JSON.parse(sizes);
      } catch {
        newSizes = sizes.split(",").map((s) => s.trim());
      }
    } else if (size) {
      newSizes = size.split(",").map((s) => s.trim());
    }

    // Parse colors
    if (colors) {
      try {
        newColor = JSON.parse(colors);
      } catch {
        if (colors.includes(",")) {
          newColor = colors.split(",").map((c) => c.trim());
        } else {
          newColor = [colors.trim()];
        }
      }
    }

    console.log("PARSED SIZES:", newSizes);
    console.log("PARSED COLORS:", newColor);

    product.variants.push({
      size: newSizes[0] || "",
      sizes: newSizes,
      colors: newColor,
      price,
      stock,
      images: req.imageUrls || []
    });

    await product.save();

    console.log("SAVED PRODUCT:", product);

    res.json(product);

  } catch (err) {
    console.log("ADD VARIANT ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};

// =====================
// ✏ UPDATE VARIANT
// =====================

exports.updateVariant = async (req, res) => {
  try {
    const { productId, variantId, sizes, price, stock, colors } = req.body;

    console.log("UPDATE VARIANT REQ BODY:", req.body);
    console.log("RAW COLORS:", colors);
    console.log("RAW SIZES:", sizes);

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found ❌" });
    }

    const variant = product.variants.id(variantId);

    if (!variant) {
      return res.status(404).json({ message: "Variant not found ❌" });
    }

    // Parse sizes
    let finalSizes = [];

    if (sizes) {
      try {
        finalSizes = JSON.parse(sizes);
      } catch {
        finalSizes = sizes.split(",").map((s) => s.trim());
      }
    }

    // Parse colors
    let finalColors = [];

    if (colors) {
      try {
        finalColors = JSON.parse(colors);
      } catch {
        if (colors.includes(",")) {
          finalColors = colors.split(",").map((c) => c.trim());
        } else {
          finalColors = [colors.trim()];
        }
      }
    }

    console.log("FINAL SIZES:", finalSizes);
    console.log("FINAL COLORS:", finalColors);

    // Check duplicate variant
    const exists = product.variants.find(
      (v) =>
        JSON.stringify(v.colors || []) === JSON.stringify(finalColors) &&
        JSON.stringify(v.sizes || []) === JSON.stringify(finalSizes) &&
        v._id.toString() !== variantId
    );

    if (exists) {
      return res.status(400).json({ message: "Variant already exists ❌" });
    }

    console.log("BEFORE UPDATE:", variant);

    // Update sizes
    if (finalSizes.length > 0) {
      variant.sizes = finalSizes;
      variant.size = finalSizes[0];
      variant.markModified("sizes");
    }

    // Update colors
    if (finalColors.length > 0) {
      variant.colors = finalColors;
      variant.markModified("colors");
    }

    variant.price = price || variant.price;
    variant.stock = stock || variant.stock;

    // Update images
    if (req.imageUrls) {
      variant.images = req.imageUrls;
      variant.markModified("images");
    }

    console.log("AFTER UPDATE:", variant);

    await product.save();

    console.log("SAVED VARIANT:", product.variants.id(variantId));

    res.json(product);

  } catch (err) {
    console.log("UPDATE VARIANT ERROR:", err);
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