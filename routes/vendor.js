const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const upload = require('../config/upload');

// Middleware: Check if vendor
const isVendor = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'vendor') {
    return res.redirect('/');
  }
  next();
};

// GET: Vendor dashboard
router.get('/', isVendor, async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ owner: req.session.user._id });

    if (!vendor) {
      return res.render('vendor-dashboard', { 
        vendor: null, 
        products: [],
        error: 'You need to create a vendor profile first'
      });
    }

    const products = await Product.find({ vendor: vendor._id });

    res.render('vendor-dashboard', { 
      vendor, 
      products,
      error: null
    });
  } catch (err) {
    console.error('Vendor dashboard error:', err);
    res.render('vendor-dashboard', { 
      vendor: null, 
      products: [],
      error: 'Error loading dashboard'
    });
  }
});

router.get('/add-product', isVendor, async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ owner: req.session.user._id });

    if (!vendor) {
      return res.redirect('/vendor?error=Vendor profile not found');
    }

    if (!vendor.isVerified) {
      return res.redirect('/vendor?error=Waiting for admin approval');
    }

    res.render('vendor-add-product', { vendor, error: null });

  } catch (err) {
    console.error(err);
    res.render('vendor-add-product', { vendor: null, error: 'Error loading form' });
  }
});

// POST: Create product with image upload
router.post('/add-product', isVendor, upload.single('productImage'), async (req, res) => {
  try {
    const { name, description, price, category, stock } = req.body;

    if (!name || !price || !category || !stock) {
      // Delete uploaded file if validation fails
      if (req.file) {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      }
      return res.render('vendor-add-product', { 
        error: 'All fields are required',
        vendor: null
      });
    }

    if (price <= 0 || stock <= 0) {
      // Delete uploaded file if validation fails
      if (req.file) {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      }
      return res.render('vendor-add-product', { 
        error: 'Price and stock must be greater than 0',
        vendor: null
      });
    }

    const vendor = await Vendor.findOne({ owner: req.session.user._id });

    if (!vendor) {
      // Delete uploaded file if vendor not found
      if (req.file) {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      }
      return res.redirect('/vendor?error=Vendor profile not found');
    }

    if (!vendor.isVerified) {
      // Delete uploaded file if vendor not verified
      if (req.file) {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      }
      return res.render('vendor-add-product', { 
        error: 'Your account is not approved by admin yet',
        vendor: vendor
      });
    }

    // Set image path
    let imagePath = 'https://via.placeholder.com/400x400?text=' + encodeURIComponent(name);
    if (req.file) {
      imagePath = '/uploads/' + req.file.filename;
    }

    const product = new Product({
      name,
      description,
      price: parseFloat(price),
      category,
      stock: parseInt(stock),
      vendor: vendor._id,
      image: imagePath
    });

    await product.save();

    console.log('Product added by vendor:', name);
    res.redirect('/vendor?notification=Product added successfully!');
  } catch (err) {
    // Delete uploaded file if error occurs
    if (req.file) {
      const fs = require('fs');
      fs.unlinkSync(req.file.path);
    }
    console.error('Error adding product:', err);
    res.render('vendor-add-product', { 
      error: 'Error adding product: ' + err.message,
      vendor: null
    });
  }
});

// POST: Delete product
router.post('/delete-product/:id', isVendor, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.json({ success: false, message: 'Product not found' });
    }

    const vendor = await Vendor.findOne({ owner: req.session.user._id });
    
    if (product.vendor.toString() !== vendor._id.toString()) {
      return res.json({ success: false, message: 'You cannot delete this product' });
    }

    // Delete image file if exists
    if (product.image && product.image.startsWith('/uploads/')) {
      const fs = require('fs');
      const filePath = './public' + product.image;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Product.findByIdAndDelete(req.params.id);

    console.log('Product deleted:', product.name);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;