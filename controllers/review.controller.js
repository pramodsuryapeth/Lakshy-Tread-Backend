const Review = require("../models/Review");
const redisClient = require("../config/redis");

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

    // 🧠 clear cache (specific product reviews)
    await redisClient.del(`reviews:${productId}`);

    res.json({ message: "Review added ✅", review });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 📦 Get Product Reviews
exports.getReviews = async (req, res) => {
  try {
    const productId = req.params.productId;

    // 🔥 Redis first
    const cached = await redisClient.get(`reviews:${productId}`);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const reviews = await Review.find({
      productId
    }).populate("userId");

    // 🧠 cache (10 min)
    await redisClient.set(
      `reviews:${productId}`,
      JSON.stringify(reviews),
      { EX: 60 * 10 }
    );

    res.json(reviews);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};