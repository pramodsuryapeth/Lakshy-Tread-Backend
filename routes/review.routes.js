const express = require("express");
const router = express.Router();

const { verifyUser } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware"); // cloudinary

const {
  addReview,
  getReviews
} = require("../controllers/review.controller");

// ➕ Add review
router.post(
  "/add",
  verifyUser,
  upload.array("images", 5), // max 5 images
  addReview
);

// 📦 Get reviews
router.get("/:productId", getReviews);

module.exports = router;