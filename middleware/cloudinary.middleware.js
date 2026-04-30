const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

exports.uploadToCloudinary = (folderName) => {
  return async (req, res, next) => {
    try {
      const files = req.files || (req.file ? [req.file] : []);

      if (!files.length) return next();

      const uploadFromBuffer = (file) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: folderName, // ✅ FIXED

              // 🔥 PERFORMANCE BOOST
              transformation: [
                { width: 800, height: 800, crop: "limit" },
                { quality: "auto" },
                { fetch_format: "auto" }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );

          streamifier.createReadStream(file.buffer).pipe(stream);
        });
      };

      const uploads = await Promise.all(
        files.map(file => uploadFromBuffer(file))
      );

      const urls = uploads.map(u => u.secure_url);

      req.imageUrls = urls;
      req.imageUrl = urls[0];

      next();

    } catch (err) {
      console.error("Cloudinary Error:", err);
      res.status(500).json({ message: "Image upload failed ❌" });
    }
  };
};