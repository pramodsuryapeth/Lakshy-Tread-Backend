const Review = require("../models/Review");

// ➕ Add Review
exports.addReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;

    const imageUrls = req.files.map(file => file.path);

    const review = new Review({
      userId: req.user.userId,
      productId,
      rating,
      comment,
      images: imageUrls
    });

    await review.save();

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
    }).populate("userId");

    res.json(reviews);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};