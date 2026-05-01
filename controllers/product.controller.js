const Product = require("../models/Product");
const redisClient = require("../config/redis");

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

    // 🧠 clear cache
    await redisClient.del("products:all");

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

    // 🧠 clear cache
    await redisClient.del("products:all");

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

    // 🧠 clear cache
    await redisClient.del("products:all");

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

    // 🔥 normalize sizes
    let newSizes = [];

    if (sizes) {
      try {
        newSizes = JSON.parse(sizes);
      } catch {
        newSizes = [];
      }
    } else if (size) {
      newSizes = size.split(",");
    }

    // 🔥 FIND SAME COLOR VARIANT
    // let existingVariant = product.variants.find(
    //   (v) => v.color.toLowerCase() === color.toLowerCase()
    // );

    // if (existingVariant) {
    //   // ✅ MERGE SIZES

    //   const merged = [
    //     ...(existingVariant.sizes || []),
    //     ...newSizes
    //   ];

    //   existingVariant.sizes = [...new Set(merged)];

    //   // optional update
    //   existingVariant.price = price || existingVariant.price;
    //   existingVariant.stock = stock || existingVariant.stock;

    //   if (req.imageUrls) {
    //     existingVariant.images = req.imageUrls;
    //   }

    // } else {
      // ✅ CREATE NEW VARIANT

      product.variants.push({
        size: newSizes[0] || "",
        sizes: newSizes,
        color,
        price,
        stock,
        images: req.imageUrls || []
      });
    // }

    await product.save();
    await redisClient.del("products:all");

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

    // 🔥 normalize sizes
    let finalSizes = [];

    if (sizes && Array.isArray(sizes)) {
      finalSizes = sizes;
    } else if (size) {
      finalSizes = [size]; // fallback
    }

    // 🔥 duplicate check (color + sizes combo)
    const exists = product.variants.find(
      (v) =>
        v.color === (color || variant.color) &&
        JSON.stringify(v.sizes || []) === JSON.stringify(finalSizes) &&
        v._id.toString() !== variantId
    );

    if (exists) {
      return res.status(400).json({ message: "Variant already exists ❌" });
    }

    // 🔥 update fields
    if (finalSizes.length > 0) {
      variant.sizes = finalSizes;   // new field
      variant.size = finalSizes[0]; // backward support
    }

    variant.color = color || variant.color;
    variant.price = price || variant.price;
    variant.stock = stock || variant.stock;

    // 🔥 images update
    if (req.imageUrls) {
      variant.images = req.imageUrls;
    }

    await product.save();

    // 🧠 clear cache
    await redisClient.del("products:all");

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

    await redisClient.del("products:all");

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
    let cached = null;

    // 🔥 Try Redis safely
    try {
      cached = await redisClient.get("products:all");
    } catch (redisErr) {
      console.error("⚠️ Redis Error:", redisErr.message);
    }

    if (cached) {
      console.log("📦 From Redis Cache");
      return res.json(JSON.parse(cached));
    }

    // 🔥 DB fetch
    const products = await Product.find();

    console.log("🗄️ From Database");

    // 🔥 Store in Redis (safe)
    try {
      await redisClient.set(
        "products:all",
        JSON.stringify(products),
        { EX: 60 * 10 }
      );
    } catch (redisErr) {
      console.error("⚠️ Redis Set Error:", redisErr.message);
    }

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