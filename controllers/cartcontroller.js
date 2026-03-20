const Cart = require("../models/Cart");

exports.addToCart = async (req, res) => {
  try {
    const { productId, name, size, color, price, quantity } = req.body;
    const userId = req.user.userId;

    const customImage = req.file ? req.file.filename : null; // 🔥 ADD THIS

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingItem = cart.items.find(
      item =>
        item.productId.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (existingItem) {
      existingItem.quantity += quantity;

      // 🔥 OPTIONAL: update image if new upload
      if (customImage) {
        existingItem.customImage = customImage;
      }

    } else {
      cart.items.push({
        productId,
        name,
        size,
        color,
        price,
        quantity,
        image: req.body.image, // product image
        customImage // 🔥 ADD THIS
      });
    }

    await cart.save();

    res.json(cart);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getCart = async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user.userId });
  res.json(cart);
};

exports.removeFromCart = async (req, res) => {
  const { productId } = req.body;
  const userId = req.user.userId;

  const cart = await Cart.findOne({ userId });

  cart.items = cart.items.filter(
    item => item.productId.toString() !== productId
  );

  await cart.save();

  res.json(cart);
};

exports.updateCart = async (req, res) => {
  const { productId, size, color, quantity, customImage } = req.body;
  const userId = req.user.userId;

  const cart = await Cart.findOne({ userId });

  const item = cart.items.find(
    i =>
      i.productId.toString() === productId &&
      i.size === size &&
      i.color === color &&
      i.customImage === customImage // 🔥 IMPORTANT
  );

  if (item) {
    item.quantity = quantity;
  }

  await cart.save();

  res.json(cart);
};