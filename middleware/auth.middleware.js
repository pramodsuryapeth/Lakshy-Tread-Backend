const jwt = require("jsonwebtoken");

exports.verifyUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token ❌" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔥 user role check
    if (decoded.role !== "user") {
      return res.status(403).json({ message: "User access only ❌" });
    }

    req.user = decoded;

    next();

  } catch (err) {
    res.status(401).json({ message: "Invalid token ❌" });
  }
};

exports.verifyAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token ❌" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔥 admin role check
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin only ❌" });
    }

    req.admin = decoded;

    next();

  } catch (err) {
    res.status(401).json({ message: "Invalid token ❌" });
  }
};