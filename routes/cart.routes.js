const express = require("express");
const router = express.Router();

const { verifyUser } = require("../middleware/auth.middleware");

const {
  addToCart,
  getCart,
  removeFromCart,
  updateCart
} = require("../controllers/cart.controller");

router.post("/add", verifyUser, addToCart);
router.get("/", verifyUser, getCart);
router.delete("/remove", verifyUser, removeFromCart);
router.put("/update", verifyUser, updateCart);

module.exports = router;