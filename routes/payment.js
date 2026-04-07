const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Middleware: Check authentication
const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// GET: Checkout page (show payment form)
router.get('/checkout', isAuthenticated, async (req, res) => {
  try {
    const cart = req.session.cart || [];
    const deliveryAddress = req.session.deliveryAddress;

    console.log('Payment checkout page:');
    console.log('Cart:', cart);
    console.log('Cart length:', cart.length);
    console.log('Delivery address:', deliveryAddress);

    if (!cart || cart.length === 0) {
      console.log('Cart is empty');
      return res.redirect('/cart?error=Cart is empty');
    }

    if (!deliveryAddress) {
      console.log('Delivery address missing');
      return res.redirect('/cart?error=Delivery address required');
    }

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => {
      const price = parseFloat(item.price);
      const qty = parseInt(item.quantity);
      console.log(`  Item: ${item.name}, Price: ${price}, Qty: ${qty}, Total: ${price * qty}`);
      return sum + (price * qty);
    }, 0);
    
    const totalAmount = subtotal + 50; // +50 delivery fee

    console.log('  Subtotal:', subtotal);
    console.log('  Total amount:', totalAmount);

    res.render('payment-checkout', {
      cart,
      deliveryAddress,
      subtotal,
      totalAmount,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'demo_key'
    });
  } catch (err) {
    console.error('Error loading payment page:', err);
    res.redirect('/cart?error=Error loading payment page');
  }
});

// POST: Create Order (Mock - without Razorpay)
router.post('/create-order', isAuthenticated, async (req, res) => {
  try {
    console.log('Creating order...');
    console.log('Request body:', req.body);
    
    const { deliveryAddress, cart } = req.body;

    console.log('Cart received:', cart);
    console.log('Cart type:', typeof cart);
    console.log('Cart is array:', Array.isArray(cart));
    console.log('Cart length:', cart ? cart.length : 'undefined');

    // Validate cart
    if (!cart) {
      console.log('Cart is undefined');
      return res.json({ success: false, message: 'Cart is undefined' });
    }

    if (!Array.isArray(cart)) {
      console.log('Cart is not an array');
      return res.json({ success: false, message: 'Cart is not an array' });
    }

    if (cart.length === 0) {
      console.log('Cart is empty');
      return res.json({ success: false, message: 'Cart is empty' });
    }

    if (!deliveryAddress) {
      console.log('Delivery address missing');
      return res.json({ success: false, message: 'Delivery address required' });
    }

    // Calculate total
    const subtotal = cart.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * parseInt(item.quantity));
    }, 0);

    const totalAmount = subtotal + 50; // +50 delivery fee

    console.log('  Calculated subtotal:', subtotal);
    console.log('  Total amount:', totalAmount);

    // Create order in database
    const order = new Order({
      orderNumber: `ORD-${Date.now()}`,
      customer: req.session.user._id,
      items: cart.map(item => ({
        product: item.productId,
        quantity: parseInt(item.quantity),
        price: parseFloat(item.price)
      })),
      totalAmount,
      deliveryAddress,
      status: 'Pending',
      paymentStatus: 'Pending'
    });

    await order.save();

    console.log('Order created successfully:', order.orderNumber);

    res.json({
      success: true,
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: totalAmount * 100,
      currency: 'INR'
    });
  } catch (err) {
    console.error('Error creating order:', err.message);
    res.json({ success: false, message: 'Error creating order: ' + err.message });
  }
});

// POST: Verify Payment
router.post('/verify-payment', isAuthenticated, async (req, res) => {
  try {
    console.log('Verifying payment...');
    const { orderId, paymentMethod } = req.body;

    console.log('  Order ID:', orderId);
    console.log('  Payment method:', paymentMethod);

    if (!orderId) {
      console.log('Order ID missing');
      return res.json({ success: false, message: 'Order ID missing' });
    }

    // Find and update order
    const order = await Order.findById(orderId);
    if (!order) {
      console.log('Order not found:', orderId);
      return res.json({ success: false, message: 'Order not found' });
    }

    // Update payment status (mock - always success for demo)
    order.paymentStatus = 'Paid';
    order.status = 'Confirmed';
    await order.save();

    // Clear cart from session
    req.session.cart = [];
    req.session.deliveryAddress = null;
    req.session.save();

    console.log('Payment verified for order:', order.orderNumber);

    res.json({
      success: true,
      message: 'Payment successful',
      orderId: order._id,
      orderNumber: order.orderNumber
    });
  } catch (err) {
    console.error('Verification error:', err.message);
    res.json({ success: false, message: 'Error verifying payment: ' + err.message });
  }
});

// GET: Payment success page
router.get('/payment-success/:orderId', isAuthenticated, async (req, res) => {
  try {
    console.log('Loading payment success page for order:', req.params.orderId);
    
    const order = await Order.findById(req.params.orderId)
      .populate('items.product')
      .populate('customer', 'username email');

    if (!order) {
      console.log('Order not found');
      return res.status(404).render('404');
    }

    console.log('Order loaded:', order.orderNumber);
    res.render('payment-success', { order, error: null });
  } catch (err) {
    console.error('Error loading success page:', err);
    res.status(500).render('404');
  }
});

// GET: Payment failed page
router.get('/payment-failed/:orderId', isAuthenticated, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).render('404');
    }

    res.render('payment-failed', { order, error: null });
  } catch (err) {
    res.status(500).render('404');
  }
});

module.exports = router;