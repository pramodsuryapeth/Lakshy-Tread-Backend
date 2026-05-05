const Review = require("../models/Review");
const Order = require("../models/Order");

// ➕ Add Review
exports.addReview = async (req, res) => {
  try {
    const { productId, rating, comment, orderId } = req.body;

    // 🔥 Cloudinary URLs
    const imageUrls = req.imageUrls || [];

    // 🔥 Prevent duplicate review
    const existing = await Review.findOne({
      userId: req.user.userId,
      orderId
    });

    // if (existing) {
    //   return res.status(400).json({ message: "Already reviewed ❌" });
    // }

    const review = new Review({
      userId: req.user.userId,
      productId,
      orderId, // 🔥 important
      rating,
      comment,
      images: imageUrls
    });

    await review.save();

    // 🔥 mark order as reviewed
    await Order.findByIdAndUpdate(orderId, {
      isReviewed: true
    });

    res.json({ message: "Review added ✅", review });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 📦 Get Product Reviews
exports.getReviews = async (req, res) => {
  try {
    const productId = req.params.productId;

    const reviews = await Review.find({
      productId
    }).populate("userId", "email");

    res.json(reviews);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};