const Cart = require("../models/Cart");
const redisClient = require("../config/redis");

// ➕ Add to Cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, name, size, color, price, quantity } = req.body;
    const userId = req.user.userId;

    const customImage = req.file ? req.file.filename : null;

    let cart;

    // 🔥 1. Try Redis first
    const cachedCart = await redisClient.get(`cart:${userId}`);

    if (cachedCart) {
      cart = JSON.parse(cachedCart);
    } else {
      cart = await Cart.findOne({ userId });

      if (!cart) {
        cart = new Cart({ userId, items: [] });
      }
    }

    // 🔍 Find item
    const existingItem = cart.items.find(
      item =>
        item.productId.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (existingItem) {
      existingItem.quantity += quantity;

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
        image: req.body.image,
        customImage
      });
    }

    // 💾 Save in DB
    await Cart.findOneAndUpdate(
      { userId },
      cart,
      { upsert: true, new: true }
    );

    // 🧠 Update Redis
    await redisClient.set(`cart:${userId}`, JSON.stringify(cart), {
      EX: 60 * 60 // 1 hour
    });

    res.json(cart);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// 🛒 Get Cart
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 🔥 Redis first
    const cachedCart = await redisClient.get(`cart:${userId}`);

    if (cachedCart) {
      return res.json(JSON.parse(cachedCart));
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.json({ userId, items: [] });
    }

    // 🧠 Cache it
    await redisClient.set(`cart:${userId}`, JSON.stringify(cart), {
      EX: 60 * 60
    });

    res.json(cart);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// ❌ Remove from Cart
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.userId;

    let cart = await Cart.findOne({ userId });

    cart.items = cart.items.filter(
      item => item.productId.toString() !== productId
    );

    await cart.save();

    // 🧠 Update Redis
    await redisClient.set(`cart:${userId}`, JSON.stringify(cart), {
      EX: 60 * 60
    });

    res.json(cart);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// 🔄 Update Cart
exports.updateCart = async (req, res) => {
  try {
    const { productId, size, color, quantity, customImage } = req.body;
    const userId = req.user.userId;

    let cart = await Cart.findOne({ userId });

    const item = cart.items.find(
      i =>
        i.productId.toString() === productId &&
        i.size === size &&
        i.color === color &&
        i.customImage === customImage
    );

    if (item) {
      item.quantity = quantity;
    }

    await cart.save();

    // 🧠 Update Redis
    await redisClient.set(`cart:${userId}`, JSON.stringify(cart), {
      EX: 60 * 60
    });

    res.json(cart);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};