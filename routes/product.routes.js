const express = require("express");
const router = express.Router();

const { verifyAdmin } = require("../middleware/admin.middleware");
const upload = require("../middleware/upload.middleware");
const { uploadToCloudinary } = require("../middleware/cloudinary.middleware");

const {
  addProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  addVariant,
  updateVariant,
  deleteVariant
} = require("../controllers/product.controller");

// 🔐 Protect all routes
router.use(verifyAdmin);

// =====================
// 📦 PRODUCT ROUTES
// =====================

// ➕ Add product (with image)
router.post(
  "/add",
  upload.single("image"),   // 🔥 FIX
  uploadToCloudinary,
  addProduct
);

// 📦 Get all products
router.get("/", getProducts);

// ✏ Update product (with optional image)
router.put(
  "/update",
  upload.single("image"),   // 🔥 recommended
  uploadToCloudinary,
  updateProduct
);

// ❌ Delete product
router.delete("/:productId", deleteProduct);

// =====================
// 🔁 VARIANT ROUTES
// =====================

// ➕ Add variant (with image)
router.post(
  "/variant",
  upload.single("image"),
  uploadToCloudinary,
  addVariant
);

// ✏ Update variant (with optional image)
router.put(
  "/variant",
  upload.single("image"),
  uploadToCloudinary,
  updateVariant
);

// ❌ Delete variant
router.delete("/variant", deleteVariant);

module.exports = router;