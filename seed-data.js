require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const Vendor = require('./models/Vendor');
const User = require('./models/User');
const bcrypt=require('bcrypt');

mongoose.connect(process.env.MONGO_URI);

const products = [
  // Vegetables
  {
    name: 'Fresh Tomato',
    price: 30,
    category: 'Vegetables',
    stock: 100,
    description: 'Red ripe tomatoes',
    image: '/images/tomato.jpg'  // ← Changed to /images/...
  },
  {
    name: 'Carrot',
    price: 25,
    category: 'Vegetables',
    stock: 80,
    description: 'Fresh orange carrots',
    image: '/images/carrot.jpg'  // ← Changed
  },
  {
    name: 'Onion',
    price: 20,
    category: 'Vegetables',
    stock: 150,
    description: 'White onions',
    image: '/images/onion.jpg'  // ← Changed
  },
  {
    name: 'Potato',
    price: 35,
    category: 'Vegetables',
    stock: 120,
    description: 'Fresh potatoes',
    image: '/images/potato.jpg'  // ← Changed
  },
  // Fruits
  {
    name: 'Apple',
    price: 80,
    category: 'Fruits',
    stock: 60,
    description: 'Red delicious apples',
    image: '/images/apple.jpg'
  },
  {
    name: 'Banana',
    price: 40,
    category: 'Fruits',
    stock: 120,
    description: 'Golden bananas',
    image: '/images/banana.jpg'
  },
  {
    name: 'Orange',
    price: 60,
    category: 'Fruits',
    stock: 90,
    description: 'Fresh oranges',
    image: '/images/orange.jpg'
  },
  {
    name: 'Mango',
    price: 100,
    category: 'Fruits',
    stock: 50,
    description: 'Sweet mangoes',
    image: '/images/mango.jpg'
  },
  // Dairy
  {
    name: 'Milk (1L)',
    price: 50,
    category: 'Dairy',
    stock: 200,
    description: 'Pure fresh milk',
    image: '/images/milk.jpg'
  },
  {
    name: 'Paneer (250g)',
    price: 120,
    category: 'Dairy',
    stock: 75,
    description: 'Fresh paneer cheese',
    image: '/images/paneer.jpg'
  },
  {
    name: 'Yogurt (500g)',
    price: 60,
    category: 'Dairy',
    stock: 100,
    description: 'Creamy yogurt',
    image: '/images/yogurt.jpg'
  },
  {
    name: 'Butter (100g)',
    price: 80,
    category: 'Dairy',
    stock: 60,
    description: 'Fresh butter',
    image: '/images/butter.jpg'
  },
  // Snacks
  {
    name: 'Potato Chips',
    price: 45,
    category: 'Snacks',
    stock: 150,
    description: 'Crispy potato chips',
    image: '/images/potato_chips.jpg'
  },
  {
    name: 'Biscuits',
    price: 35,
    category: 'Snacks',
    stock: 200,
    description: 'Butter biscuits',
    image: '/images/biscuits.jpg'
  },
  {
    name: 'Cookies',
    price: 55,
    category: 'Snacks',
    stock: 120,
    description: 'Chocolate cookies',
    image: '/images/cookies.jpg'
  },
  // Beverages
  {
    name: 'Pepsi (2L)',
    price: 65,
    category: 'Beverages',
    stock: 120,
    description: 'Pepsi cola',
    image: '/images/pepsi.jpg'
  },
  {
    name: 'Orange Juice',
    price: 50,
    category: 'Beverages',
    stock: 100,
    description: 'Fresh orange juice',
    image: '/images/orange_juice.jpg'
  },
  {
    name: 'Coca Cola (2L)',
    price: 65,
    category: 'Beverages',
    stock: 150,
    description: 'Coca Cola',
    image: '/images/coca_cola.jpg'
  },
  // Bakery
  {
    name: 'Bread',
    price: 40,
    category: 'Bakery',
    stock: 80,
    description: 'White bread loaf',
    image: '/images/bread.jpg'
  },
  {
    name: 'Croissant',
    price: 35,
    category: 'Bakery',
    stock: 60,
    description: 'Butter croissant',
    image: '/images/croissant.jpg'
  },
  {
    name: 'Cake',
    price: 150,
    category: 'Bakery',
    stock: 30,
    description: 'Chocolate cake',
    image: '/images/cake.jpg'
  }
];

async function seedDB() {
  try {
    // Clear existing products
    await Product.deleteMany({});
    console.log('🗑️  Cleared existing products');

    // ✅ Ensure a vendor exists
    let vendor = await Vendor.findOne();

    if (!vendor) {
      console.log("⚠️ No vendor found, creating default vendor...");

      const salt = await bcrypt.genSalt(10);
      // Hash password
      const hashedPassword = await bcrypt.hash("vendor123", salt);

      // Create user
      const user = await User.create({
        username: 'defaultvendor',
        email: 'vendor@blinkit.com',
        password: hashedPassword,
        phone: '1234567890',
        role: 'vendor',
        isActive: true
      });

      // Create vendor
      vendor = await Vendor.create({
        businessName: "Default Store",
        owner: user._id,
        isVerified: true
      });

      console.log("✅ Default vendor created");
    }

    // ✅ Attach vendor to all products
    const productsWithVendor = products.map(product => ({
      ...product,
      vendor: vendor._id
    }));

    // Insert products
    const result = await Product.insertMany(productsWithVendor);
    console.log(`✅ ${result.length} products added to database`);

    mongoose.connection.close();
    console.log('✅ Database connection closed');

  } catch (err) {
    console.error('❌ Error seeding database:', err.message);
    mongoose.connection.close();
  }
}

seedDB();
