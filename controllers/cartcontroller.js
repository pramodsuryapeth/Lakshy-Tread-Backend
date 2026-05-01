const Cart = require("../models/Cart");

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

    // 🔥 Direct DB check (NO Redis)
    const dbCart = await Cart.findOne({ userId });
    cart = dbCart ? dbCart.toObject() : { userId, items: [] };

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

    res.json(updatedCart);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// 🛒 Get Cart
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 🔥 Direct DB (NO Redis)
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.json({ userId, items: [] });
    }

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

    // 🔥 cart empty → delete
    if (cart.items.length === 0) {
      await Cart.findOneAndDelete({ userId });
      return res.json({ items: [] });
    }

    await cart.save();

    res.json(cart);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 🔄 Update Cart
exports.updateCart = async (req, res) => {
  try {
    const { variantId, quantity } = req.body;
    const userId = req.user.userId;

    let cart = await Cart.findOne({ userId });

    const item = cart.items.find(
      i => i.variantId === variantId
    );

    if (item) {
      item.quantity = quantity;
    }

    await cart.save();

    res.json(cart);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};