const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const bcrypt = require('bcrypt');

// GET: Signup page
router.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

// POST: Create new user
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, confirmPassword, phone, role } = req.body;

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      return res.render('signup', { error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.render('signup', { error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.render('signup', { error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    let existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.render('signup', { error: 'Email or username already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      phone,
      role: role || 'customer'
    });

    await user.save();

    // If vendor, create vendor profile
    if (role === 'vendor') {
      const vendor = new Vendor({
        businessName: username + "'s Store",
        owner: user._id,
        email: email,
        phone: phone,
        address: 'Not set yet',
        isVerified: false
      });
      await vendor.save();
      console.log('Vendor profile created for:', username);
    }

    req.session.user = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    res.redirect('/?notification=Account created successfully!');
  } catch (err) {
    console.error(err);
    res.render('signup', { error: 'Error creating account: ' + err.message });
  }
});

// GET: Login page
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// POST: Authenticate user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.render('login', { error: 'Username and password required' });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.render('login', { error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.render('login', { error: 'Invalid credentials' });
    }

    
    req.session.user = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    res.redirect('/?notification=Logged in successfully!');
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Error logging in' });
  }
});

// GET: Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect('/?error=Error logging out');
    }
    res.redirect('/?notification=Logged out successfully!');
  });
});

module.exports = router;