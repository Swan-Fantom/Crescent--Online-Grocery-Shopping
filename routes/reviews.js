const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');

// Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Please login to add reviews' });
  }
  next();
};

// POST: Add a review
router.post('/:productId', isLoggedIn, async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, title, comment } = req.body;

    console.log('📝 Review submission attempt:', {
      productId,
      userId: req.session.user._id,
      rating,
      title
    });

    // Validate input
    if (!rating || !title || !comment) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: req.session.user._id
    });

    if (existingReview) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already reviewed this product' 
      });
    }

    // Create new review
    const review = new Review({
      product: productId,
      user: req.session.user._id,
      rating: parseInt(rating),
      title,
      comment
    });

    const savedReview = await review.save();
    console.log('✅ Review saved:', savedReview._id);

    // Update product with review
    if (!product.reviews) {
      product.reviews = [];
    }
    product.reviews.push(savedReview._id);
    product.reviewCount = product.reviews.length;

    // Calculate new average rating
    const allReviews = await Review.find({ product: productId });
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = (totalRating / allReviews.length).toFixed(1);
    product.rating = parseFloat(avgRating);

    await product.save();
    console.log('✅ Product updated with new rating:', avgRating);

    // Update vendor rating if product has a vendor
    if (product.vendor) {
      try {
        const vendorProducts = await Product.find({ vendor: product.vendor });
        const totalVendorRating = vendorProducts.reduce((sum, p) => sum + parseFloat(p.rating || 0), 0);
        const vendorAvgRating = (totalVendorRating / vendorProducts.length).toFixed(1);
        
        await Vendor.findByIdAndUpdate(
          product.vendor, 
          { rating: parseFloat(vendorAvgRating) },
          { new: true }
        );
        console.log('✅ Vendor rating updated:', vendorAvgRating);
      } catch (vendorErr) {
        console.error('⚠️ Error updating vendor rating:', vendorErr.message);
        // Continue even if vendor update fails
      }
    }

    res.json({ 
      success: true, 
      message: 'Review added successfully',
      review: savedReview 
    });
  } catch (err) {
    console.error('❌ Error adding review:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding review: ' + err.message 
    });
  }
});

// GET: Get all reviews for a product
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const reviews = await Review.find({ product: productId })
      .populate('user', 'username')
      .sort({ createdAt: -1 });

    console.log(`📖 Fetched ${reviews.length} reviews for product ${productId}`);

    res.json({ success: true, reviews });
  } catch (err) {
    console.error('❌ Error fetching reviews:', err);
    res.status(500).json({ success: false, message: 'Error fetching reviews' });
  }
});

// PUT: Update a review
router.put('/:reviewId', isLoggedIn, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Check if user owns the review
    if (review.user.toString() !== req.session.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only edit your own reviews' });
    }

    review.rating = parseInt(rating);
    review.title = title;
    review.comment = comment;
    review.updatedAt = Date.now();

    await review.save();
    console.log('✅ Review updated:', reviewId);

    // Recalculate product rating
    const product = await Product.findById(review.product);
    const allReviews = await Review.find({ product: review.product });
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = (totalRating / allReviews.length).toFixed(1);
    product.rating = parseFloat(avgRating);
    await product.save();

    // Update vendor rating if product has a vendor
    if (product.vendor) {
      try {
        const vendorProducts = await Product.find({ vendor: product.vendor });
        const totalVendorRating = vendorProducts.reduce((sum, p) => sum + parseFloat(p.rating || 0), 0);
        const vendorAvgRating = (totalVendorRating / vendorProducts.length).toFixed(1);
        await Vendor.findByIdAndUpdate(product.vendor, { rating: parseFloat(vendorAvgRating) });
      } catch (vendorErr) {
        console.error('⚠️ Error updating vendor rating:', vendorErr.message);
      }
    }

    res.json({ success: true, message: 'Review updated successfully' });
  } catch (err) {
    console.error('❌ Error updating review:', err);
    res.status(500).json({ success: false, message: 'Error updating review' });
  }
});

// DELETE: Delete a review
router.delete('/:reviewId', isLoggedIn, async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Check if user owns the review
    if (review.user.toString() !== req.session.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own reviews' });
    }

    const productId = review.product;
    await Review.findByIdAndDelete(reviewId);
    console.log('✅ Review deleted:', reviewId);

    // Update product
    const product = await Product.findById(productId);
    product.reviews = product.reviews.filter(r => r.toString() !== reviewId);
    product.reviewCount = product.reviews.length;

    if (product.reviews.length > 0) {
      const allReviews = await Review.find({ product: productId });
      const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = (totalRating / allReviews.length).toFixed(1);
      product.rating = parseFloat(avgRating);
    } else {
      product.rating = 0;
    }

    await product.save();

    // Update vendor rating if product has a vendor
    if (product.vendor) {
      try {
        const vendorProducts = await Product.find({ vendor: product.vendor });
        let vendorAvgRating = 0;
        if (vendorProducts.length > 0) {
          const totalVendorRating = vendorProducts.reduce((sum, p) => sum + parseFloat(p.rating || 0), 0);
          vendorAvgRating = (totalVendorRating / vendorProducts.length).toFixed(1);
        }
        await Vendor.findByIdAndUpdate(product.vendor, { rating: parseFloat(vendorAvgRating) });
      } catch (vendorErr) {
        console.error('⚠️ Error updating vendor rating:', vendorErr.message);
      }
    }

    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting review:', err);
    res.status(500).json({ success: false, message: 'Error deleting review' });
  }
});

module.exports = router;