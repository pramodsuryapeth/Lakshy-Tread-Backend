const express = require("express");
const router = express.Router();
const upload = require('../middleware/upload.middleware')

const { verifyUser } = require("../middleware/auth.middleware");

const {
  addToCart,
  getCart,
  removeFromCart,
  updateCart
} = require("../controllers/cartcontroller");

router.post("/add", verifyUser, upload.single("image"), addToCart);
router.get("/", verifyUser, getCart);
router.delete("/remove", verifyUser, removeFromCart);
router.put("/update", verifyUser, updateCart);

module.exports = router;