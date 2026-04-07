const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET: View cart
router.get('/', (req, res) => {
  const cart = req.session.cart || [];
  res.render('cart', { 
    cart,
    error: null  // ← Add this
  });
});

// POST: Add to cart (AJAX)
router.post('/add', async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!req.session.user) {
      return res.json({ success: false, message: 'Please login first' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.json({ success: false, message: 'Product not found' });
    }
    
    const qty = parseInt(quantity);
    if (product.stock < qty) {
      return res.json({ success: false, message: 'Not enough stock available' });
    }


    if (!req.session.cart) {
      req.session.cart = [];
    }

    const existingItem = req.session.cart.find(item => item.productId === productId);

    if (existingItem) {
      existingItem.quantity += parseInt(quantity);
    } else {
      req.session.cart.push({
        productId: productId,
        name: product.name,
        price: product.price,
        quantity: parseInt(quantity),
        image: product.image
      });
    }

    product.stock -= qty;
    await product.save();
    
    req.session.save();
    res.json({ success: true, message: 'Added to cart', cartCount: req.session.cart.length });
  } catch (err) {
    console.error('Cart error:', err);
    res.json({ success: false, message: err.message });
  }
});

// POST: Remove from cart
router.post('/remove/:productId', async (req, res) => {
  const { productId } = req.params;

  try {
    if (!req.session.cart) {
      return res.redirect('/cart');
    }

    const itemToRemove = req.session.cart.find(
      item => item.productId === productId
    );

    if (itemToRemove) {
      const product = await Product.findById(productId);
      if (product) {
        product.stock += itemToRemove.quantity;
        await product.save();
      }
    }
    req.session.cart = req.session.cart.filter(
      item => item.productId !== productId
    );

    req.session.save();
    res.redirect('/cart');

  } catch (err) {
    console.error('Remove cart error:', err);
    res.redirect('/cart');
  }
});

// POST: Checkout - Redirect to payment
router.post('/checkout', (req, res) => {
  const { deliveryAddress } = req.body;

  if (!req.session.user) {
    return res.render('cart', { 
      cart: req.session.cart || [],
      error: 'Please login first to checkout'
    });
  }

  if (!req.session.cart || req.session.cart.length === 0) {
    return res.render('cart', { 
      cart: [],
      error: 'Your cart is empty. Add products first!'
    });
  }

  if (!deliveryAddress || deliveryAddress.trim().length === 0) {
    return res.render('cart', { 
      cart: req.session.cart,
      error: 'Please enter a delivery address'
    });
  }

  if (deliveryAddress.trim().length < 10) {
    return res.render('cart', { 
      cart: req.session.cart,
      error: 'Delivery address must be at least 10 characters'
    });
  }

  // Store delivery address temporarily in session
  req.session.deliveryAddress = deliveryAddress;
  req.session.save();

  // Redirect to payment page
  res.redirect('/payment/checkout');
});

module.exports = router;