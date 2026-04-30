const express = require("express");
const router = express.Router();

const { verifyAdmin } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");
const { uploadToCloudinary } = require("../middleware/cloudinary.middleware");

const {
  addProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  addVariant,
  updateVariant,
  deleteVariant,
   getVariants
} = require("../controllers/product.controller");

// 🔐 Protect all routes


// =====================
// 📦 PRODUCT ROUTES
// =====================

// ➕ Add product (with image)
router.post(
  "/add",
  verifyAdmin,
  upload.array("images", 5),
  uploadToCloudinary("products"), // ✅ MUST CALL FUNCTION
  addProduct
);

// 📦 Get all products
router.get("/", getProducts);

// ✏ Update product (with optional image)
router.put(
  "/update",
  verifyAdmin,
  upload.array("images", 5),  // 🔥 recommended
  uploadToCloudinary("products"),
  updateProduct
);

// ❌ Delete product
router.delete("/:productId", verifyAdmin, deleteProduct);

// =====================
// 🔁 VARIANT ROUTES
// =====================

// ➕ Add variant (with image)
router.post(
  "/variant",
  verifyAdmin,
  upload.array("images", 5),
  uploadToCloudinary("variants"),
  addVariant
);
router.get("/variant/:productId", getVariants);

// ✏ Update variant (with optional image)
router.put(
  "/variant",
  verifyAdmin,
  upload.array("images", 5),
  uploadToCloudinary("variants"),
  updateVariant
);

// ❌ Delete variant
router.delete("/variant/:variantId", verifyAdmin, deleteVariant);

module.exports = router;