const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const Order = require('../models/Order');
const upload = require('../config/upload');

// Middleware: Check if admin
const isAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).render('404');
  }
  next();
};

// GET: Admin dashboard
router.get('/', isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalVendors = await Vendor.countDocuments();
    const unverifiedVendors = await Vendor.countDocuments({ isVerified: false });

    res.render('admin', {
      stats: { totalUsers, totalProducts, totalOrders, totalVendors, unverifiedVendors },
      error: null
    });
  } catch (err) {
    console.error(err);
    res.render('admin', { 
      error: 'Error loading dashboard',
      stats: {}
    });
  }
});

// GET: Manage vendors
router.get('/vendors', isAdmin, async (req, res) => {
  try {
    const vendors = await Vendor.find().populate('owner', 'username email phone');
    res.render('admin-vendors', { vendors, error: null });
  } catch (err) {
    console.error(err);
    res.render('admin-vendors', { 
      error: 'Error loading vendors', 
      vendors: [] 
    });
  }
});

// POST: Verify vendor
router.post('/verify-vendor/:id', isAdmin, async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    );

    if (!vendor) {
      return res.json({ success: false, message: 'Vendor not found' });
    }

    console.log('Vendor verified:', vendor.businessName);
    res.json({ success: true, message: 'Vendor verified successfully' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
});

// POST: Reject vendor
router.post('/reject-vendor/:id', isAdmin, async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { isVerified: false },
      { new: true }
    );

    if (!vendor) {
      return res.json({ success: false, message: 'Vendor not found' });
    }

    console.log('Vendor rejected:', vendor.businessName);
    res.json({ success: true, message: 'Vendor rejected' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
});

router.post('/delete-vendor/:id', isAdmin, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.json({ success: false, message: 'Vendor not found' });
    }

    // Delete all products of this vendor
    await Product.deleteMany({ vendor: vendor._id });

    // Delete user account
    if (vendor.owner) {
      await User.findByIdAndDelete(vendor.owner);
    }

    // Delete vendor
    await Vendor.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Vendor, user, and products deleted' });

  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
});

// GET: Add product page
router.get('/add-product', isAdmin, (req, res) => {
  res.render('add-product', { error: null });
});

// POST: Create product with image upload
router.post('/add-product', isAdmin, upload.single('productImage'), async (req, res) => {
  try {
    const { name, description, price, category, stock, vendor } = req.body;

    if (!name || !price || !category || !stock) {
      // Delete uploaded file if validation fails
      if (req.file) {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      }
      return res.render('add-product', { error: 'All fields required' });
    }

    // Set image path
    let imagePath = '/images/default-product.jpg';
    if (req.file) {
      imagePath = '/uploads/' + req.file.filename;
    }

    const product = new Product({
      name,
      description,
      price: parseFloat(price),
      category,
      stock: parseInt(stock),
      vendor: vendor || null,
      image: imagePath
    });

    await product.save();
    res.redirect('/admin?notification=Product added successfully');
  } catch (err) {
    // Delete uploaded file if error occurs
    if (req.file) {
      const fs = require('fs');
      fs.unlinkSync(req.file.path);
    }
    res.render('add-product', { error: err.message });
  }
});

// GET: Manage products
router.get('/products', isAdmin, async (req, res) => {
  try {
    const products = await Product.find().populate('vendor', 'businessName');
    res.render('admin-products', { products, error: null });
  } catch (err) {
    res.render('admin-products', { 
      error: 'Error loading products', 
      products: [] 
    });
  }
});

// POST: Delete product
router.post('/delete-product/:id', isAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    // Delete image file if exists
    if (product && product.image && product.image.startsWith('/uploads/')) {
      const fs = require('fs');
      const filePath = './public' + product.image;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;