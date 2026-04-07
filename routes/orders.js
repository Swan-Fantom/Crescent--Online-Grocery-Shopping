const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');

// Middleware: Check authentication
const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// GET: Customer's orders
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.session.user._id })
      .populate('items.product')
      .sort({ createdAt: -1 });

    res.render('orders', { orders });
  } catch (err) {
    console.error(err);
    res.render('orders', { error: 'Error fetching orders', orders: [] });
  }
});

// GET: Order detail
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate({
        path: 'items.product',
        select: 'name price category'
      })
      .populate('customer', 'username email address phone')
      .populate('deliveryPerson', 'username phone');

    if (!order) {
      return res.status(404).render('404');
    }

    // Verify ownership
    if (order.customer._id.toString() !== req.session.user._id) {
      return res.status(403).render('404');
    }

    console.log('Order loaded:', JSON.stringify(order, null, 2));

    res.render('order-detail', { order, error: null });
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).render('404');
  }
});

/* // POST: Update order status (Delivery person only)
router.post('/:id/update-status', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'delivery') {
      return res.json({ success: false, message: 'Unauthorized' });
    }

    const { status } = req.body;
    const validStatuses = ['Pending', 'Confirmed', 'Out for Delivery', 'Delivered', 'Cancelled'];

    if (!validStatuses.includes(status)) {
      return res.json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params._id,
      { status, deliveryPerson: req.session.user._id },
      { new: true }
    );

    res.json({ success: true, order });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
}); */

module.exports = router;