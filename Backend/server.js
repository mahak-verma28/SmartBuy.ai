const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
require('dotenv').config();

const authRoutes     = require('./routes/auth');
const wishlistRoutes = require('./routes/wishlist');
const historyRoutes  = require('./routes/history');
const searchRoutes   = require('./routes/search');
const alertRoutes    = require('./routes/alerts');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── MongoDB Connection ────────────────────────────────────────────────
const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartbuy_db';

  const options = {
    serverSelectionTimeoutMS: 30000,  // time to find a server
    connectTimeoutMS:         10000,  // time to establish connection
    socketTimeoutMS:          45000,  // time for individual operations
  };

  try {
    await mongoose.connect(uri, options);
    console.log(`✔  MongoDB connected: ${uri}`);
  } catch (err) {
    // ── Fallback: spin up in-memory server if local mongod is unavailable ──
    console.warn(`⚠  Could not connect to local MongoDB (${err.message})`);
    console.warn('   Falling back to in-memory MongoDB for this session...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const memServer = await MongoMemoryServer.create();
      const memUri    = memServer.getUri();
      await mongoose.connect(memUri, options);
      console.log('✔  In-memory MongoDB started (data will NOT persist across restarts)');
      console.log('   Run: sudo systemctl start mongod  — to use persistent storage');
    } catch (memErr) {
      console.error('✖  Could not start any MongoDB instance:', memErr.message);
      process.exit(1);
    }
  }
};

// ── Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/history',  historyRoutes);
app.use('/api/search',   searchRoutes);
app.use('/api/alerts',   alertRoutes);

// ── Health check ──────────────────────────────────────────────────────
app.get('/', (req, res) => {
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status:   'SmartBuy Backend API is running',
    database: dbState[mongoose.connection.readyState] || 'unknown',
    version:  '2.0.0'
  });
});

// ── Seed demo user ────────────────────────────────────────────────────
const seedDemoUser = async () => {
  try {
    const User      = require('../DataBase/models/User');
    const demoEmail = 'demo@smartbuy.ai';
    const existing  = await User.findOne({ email: demoEmail });
    if (!existing) {
      await User.create({
        email:    demoEmail,
        password: 'password123',
        name:     'Demo User',
        demoUser: true,
        preferences: {
          categories: ['Electronics', 'Fashion'],
          budgetMin:  500,
          budgetMax:  50000,
          currency:   'INR'
        }
      });
      console.log('✔  Demo user seeded  (demo@smartbuy.ai / password123)');
    } else {
      console.log('✔  Demo user already present');
    }
  } catch (err) {
    console.warn('⚠  Could not seed demo user:', err.message);
  }
};

// ── Graceful shutdown ─────────────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n[${signal}] Closing MongoDB connection...`);
  await mongoose.connection.close();
  console.log('✔  MongoDB disconnected. Bye!');
  process.exit(0);
};
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ── Boot sequence ─────────────────────────────────────────────────────
(async () => {
  await connectDB();
  // Wait until mongoose connection is fully open before seeding
  await new Promise((resolve) => {
    if (mongoose.connection.readyState === 1) return resolve();
    mongoose.connection.once('open', resolve);
  });
  await seedDemoUser();
  app.listen(PORT, () => {
    console.log(`✔  Server running on http://localhost:${PORT}`);
  });
})();
