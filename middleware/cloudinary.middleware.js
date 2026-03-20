// middleware/cloudinary.middleware.js
const cloudinary = require("../config/cloudinary");

exports.uploadToCloudinary = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(); // image नाही तरी पुढे जाऊ दे
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "products",
      quality: "auto:best",
      fetch_format: "auto"
    });

    // 🔥 image URL attach कर
    req.imageUrl = result.secure_url;

    next();

  } catch (err) {
    res.status(500).json({ message: "Image upload failed ❌" });
  }
};