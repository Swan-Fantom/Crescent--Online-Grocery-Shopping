require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const db = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const adminRoutes = require('./routes/admin');
const orderRoutes = require('./routes/orders');
const vendorRoutes = require('./routes/vendor');
const paymentRoutes = require('./routes/payment');
const reviewRoutes = require('./routes/reviews');

// Import models (optional - for reference, they're auto-loaded by mongoose)
// These aren't strictly needed in server.js but good to have for clarity
const User = require('./models/User');
const Product = require('./models/Product');
const Vendor = require('./models/Vendor');
const Review = require('./models/Review');
const SearchHistory = require('./models/SearchHistory');

const app = express();
const PORT = process.env.PORT || 3000;

if (process.env.RUN_SEED === 'true') {
  require('./seed-data.js');
}

// View engine setup
app.set('view engine', 'ejs');
app.set('views', './views');

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'blinkit_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: false
    }
  })
);

// Make user and cart available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.cart = req.session.cart || [];
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/products', productRoutes);
app.use('/reviews', reviewRoutes);
app.use('/cart', cartRoutes);
app.use('/admin', adminRoutes);
app.use('/orders', orderRoutes);
app.use('/vendor', vendorRoutes);
app.use('/payment', paymentRoutes);

// Home page
app.get('/', (req, res) => {
  res.render('index', {
    user: req.session.user || null,
    notification: req.query.notification || null
  });
});

// 404 error handler
app.use((req, res) => {
  res.status(404).render('404');
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📦 Models loaded: User, Product, Vendor, Review, SearchHistory`);
});
