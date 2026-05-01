const Cart = require("../models/Cart");
const redisClient = require("../config/redis");

// ➕ Add to Cart
exports.addToCart = async (req, res) => {
  try {
    const {
      productId,
      variantId,   
      name,
      size,
      color,
      price,
      quantity,
      image
    } = req.body;

    const userId = req.user.userId;

    let cart;

    // 🔥 Redis check
    const cachedCart = await redisClient.get(`cart:${userId}`);

    if (cachedCart) {
      cart = JSON.parse(cachedCart);
    } else {
      const dbCart = await Cart.findOne({ userId });
      cart = dbCart ? dbCart.toObject() : { userId, items: [] };
    }

    
    const existingItem = cart.items.find(
      item => item.variantId === variantId
    );

    if (existingItem) {
      existingItem.quantity += Number(quantity);
    } else {
      cart.items.push({
        productId,
        variantId,
        name,
        size,
        color,
        price,
        quantity,
        image
      });
    }

  
    const updatedCart = await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: cart.items } },
      { upsert: true, new: true }
    );

  
    await redisClient.set(
      `cart:${userId}`,
      JSON.stringify(updatedCart),
      { EX: 60 * 60 }
    );

    res.json(updatedCart);

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
    const { variantId } = req.body;
    const userId = req.user.userId;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // 🔥 remove item
    cart.items = cart.items.filter(
      item => item.variantId.toString() !== variantId.toString()
    );

    // 🔥 अगर cart empty झाला → delete document
    if (cart.items.length === 0) {
      await Cart.findOneAndDelete({ userId });

      await redisClient.del(`cart:${userId}`);

      return res.json({ items: [] }); // frontend ला empty cart
    }

    // 🔥 else save normally
    await cart.save();

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
    const { variantId, quantity } = req.body; // 🔥 FIX
    const userId = req.user.userId;

    let cart = await Cart.findOne({ userId });

    const item = cart.items.find(
      i => i.variantId === variantId   // 🔥 FIX
    );

    if (item) {
      item.quantity = quantity;
    }

    await cart.save();

    await redisClient.set(`cart:${userId}`, JSON.stringify(cart), {
      EX: 60 * 60
    });

    res.json(cart);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};