const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const SearchHistory = require('../models/SearchHistory');
const Review = require('../models/Review');
const Vendor = require('../models/Vendor');

// GET: All products (with search & advanced filter)
router.get('/', async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, minRating, sortBy } = req.query;
    let query = {};

    // Build search query
    if (search) {
      query.$or = [
        { name: { $regex: `^${search.trim()}`, $options: 'i' } },
        //{ description: { $regex: search, $options: 'i' } }
      ];

      // Save search history (only for logged in users)
      if (req.session.user) {
        const searchRecord = new SearchHistory({
          user: req.session.user._id,
          searchQuery: search
        });
        await searchRecord.save();
      }
    }

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Price filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Rating filter
    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    // Get products
    let productsQuery = Product.find(query).populate('vendor', 'businessName rating');

    // Sorting
    if (sortBy === 'price-low') {
      productsQuery = productsQuery.sort({ price: 1 });
    } else if (sortBy === 'price-high') {
      productsQuery = productsQuery.sort({ price: -1 });
    } else if (sortBy === 'rating') {
      productsQuery = productsQuery.sort({ rating: -1 });
    } else if (sortBy === 'newest') {
      productsQuery = productsQuery.sort({ createdAt: -1 });
    } else {
      productsQuery = productsQuery.sort({ rating: -1 }); // Default: by rating
    }

    const products = await productsQuery;
    const categories = ['Vegetables', 'Fruits', 'Dairy', 'Snacks', 'Beverages', 'Bakery'];

    res.render('products', { 
      products, 
      categories, 
      searchQuery: search || '',
      selectedCategory: category || 'all',
      selectedMinPrice: minPrice || 0,
      selectedMaxPrice: maxPrice || 10000,
      selectedMinRating: minRating || 0,
      selectedSort: sortBy || 'rating'
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('products', { 
      error: 'Error fetching products', 
      products: [], 
      categories: [],
      searchQuery: '',
      selectedCategory: 'all'
    });
  }
});

router.get('/api/search', async (req, res) => {
  try {
    const { query } = req.query;
    const products = await Product.find({
      $or: [
        { name: { $regex: `^${query}`, $options: 'i' } },
        //{ description: { $regex: query, $options: 'i' } }
      ]
    }).limit(10);

    res.json(products);
  } catch (err) {
    res.json({ error: err.message });
  }
});

// GET: Recently viewed products
router.get('/api/recently-viewed', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ success: true, products: [] });
    }

    const recentlyViewed = req.session.recentlyViewed || [];
    const products = await Product.find({ _id: { $in: recentlyViewed } });

    res.json({ success: true, products });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
});

// GET: Recommendations based on search history
router.get('/api/recommendations', async (req, res) => {
  try {
    if (!req.session.user) {
      // If not logged in, return best rated products
      const topProducts = await Product.find()
        .sort({ rating: -1 })
        .limit(10)
        .populate('vendor', 'businessName');
      return res.json({ success: true, products: topProducts });
    }

    // Get user's search history
    const searchHistory = await SearchHistory.find({ user: req.session.user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    if (searchHistory.length === 0) {
      // No search history, return trending products
      const trendingProducts = await Product.find()
        .sort({ reviewCount: -1 })
        .limit(10)
        .populate('vendor', 'businessName');
      return res.json({ success: true, products: trendingProducts });
    }

    // Find products related to search history
    const searchQueries = searchHistory.map(sh => sh.searchQuery);
    const recommendedProducts = await Product.find({
      $or: [
        { name: { $in: searchQueries.map(q => new RegExp(q, 'i')) } },
        { category: { $in: [] } }
      ]
    })
      .sort({ rating: -1 })
      .limit(12)
      .populate('vendor', 'businessName');

    res.json({ success: true, products: recommendedProducts });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
});

// GET: Search history (for logged in users)
router.get('/api/search-history', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ success: true, searches: [] });
    }

    const searches = await SearchHistory.find({ user: req.session.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('searchQuery createdAt');

    res.json({ success: true, searches });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: err.message });
  }
});

// POST: Track viewed product
router.post('/api/track-view/:productId', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.json({ success: false, message: 'Please login' });
    }

    if (!req.session.recentlyViewed) {
      req.session.recentlyViewed = [];
    }

    const productId = req.params.productId;
    // Remove if already exists, then add to beginning (most recent)
    req.session.recentlyViewed = req.session.recentlyViewed.filter(id => id !== productId);
    req.session.recentlyViewed.unshift(productId);
    // Keep only last 10 viewed items
    req.session.recentlyViewed = req.session.recentlyViewed.slice(0, 10);

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// GET: Single product details with reviews
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('vendor')
      .populate({
        path: 'reviews',
        populate: {
          path: 'user',
          select: 'username'
        }
      });

    if (!product) {
      return res.status(404).render('404');
    }

    // Track viewed product
    if (req.session.user) {
      if (!req.session.recentlyViewed) {
        req.session.recentlyViewed = [];
      }
      req.session.recentlyViewed = req.session.recentlyViewed.filter(id => id !== req.params.id);
      req.session.recentlyViewed.unshift(req.params.id);
      req.session.recentlyViewed = req.session.recentlyViewed.slice(0, 10);
    }

    // Get similar products (same category, high rated)
    const similarProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id }
    })
      .sort({ rating: -1 })
      .limit(5)
      .populate('vendor', 'businessName rating');

    res.render('product-detail', { 
      product,
      similarProducts,
      user: req.session.user || null 
    });
  } catch (err) {
    res.status(500).render('404');
  }
});

module.exports = router;