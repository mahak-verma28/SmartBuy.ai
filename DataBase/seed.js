#!/usr/bin/env node
/**
 * SmartBuy — Database Seed Script
 * Run from project root:  node DataBase/seed.js
 *
 * Seeds:
 *   - Demo user (with wishlist + search history)
 *   - 30 days of PriceHistory for 5 popular products
 *   - Product cache entries
 */

require('dotenv').config({ path: `${__dirname}/../Backend/.env` });
const mongoose     = require('mongoose');
const User         = require('./models/User');
const Product      = require('./models/Product');
const PriceHistory = require('./models/PriceHistory');
const Alert        = require('./models/Alert');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartbuy_db';

// ── Colour helpers ────────────────────────────────────────────────────
const G = '\x1b[32m', Y = '\x1b[33m', R = '\x1b[31m', B = '\x1b[1m', X = '\x1b[0m';
const log  = (m) => console.log(`  ${G}✔${X}  ${m}`);
const warn = (m) => console.log(`  ${Y}⚠${X}  ${m}`);
const err  = (m) => console.log(`  ${R}✖${X}  ${m}`);

// ── Generate realistic 30-day price history ───────────────────────────
const buildHistory = (query, basePrice) => {
  const stores  = ['Amazon', 'Flipkart', 'Myntra', 'Ajio', 'Meesho'];
  const records = [];
  const now     = Date.now();

  for (let dayAgo = 30; dayAgo >= 0; dayAgo--) {
    const date     = new Date(now - dayAgo * 24 * 60 * 60 * 1000);
    const dayVar   = 0.85 + Math.random() * 0.3;

    stores.forEach(store => {
      if (Math.random() > 0.3) {
        const storeVar = 0.95 + Math.random() * 0.1;
        records.push({
          query:      query.toLowerCase(),
          store,
          price:      Math.round(basePrice * dayVar * storeVar),
          url:        `https://www.${store.toLowerCase()}.com/search?q=${encodeURIComponent(query)}`,
          recordedAt: date
        });
      }
    });
  }
  return records;
};

// ── Main seed function ────────────────────────────────────────────────
const seed = async () => {
  console.log(`\n${B}===================================================${X}`);
  console.log(`${B}       SmartBuy — Database Seed Script            ${X}`);
  console.log(`${B}===================================================${X}\n`);

  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    log(`Connected: ${MONGO_URI}`);
  } catch (e) {
    err(`Cannot connect to MongoDB: ${e.message}`);
    err('Make sure mongod is running:  sudo systemctl start mongod');
    process.exit(1);
  }

  // ── Demo User ─────────────────────────────────────────────────────
  console.log('\n  [1/3] Seeding users...');
  const demoEmail = 'demo@smartbuy.ai';
  try {
    const exists = await User.findOne({ email: demoEmail });
    if (exists) {
      warn(`Demo user already exists — skipping`);
    } else {
      await User.create({
        email:    demoEmail,
        password: 'password123',
        name:     'Demo User',
        age:      25,
        gender:   'Prefer not to say',
        demoUser: true,
        preferences: {
          categories: ['Electronics', 'Fashion', 'Home'],
          budgetMin:  500,
          budgetMax:  50000,
          currency:   'INR'
        },
        wishlist: [
          { name: 'iPhone 15',          url: 'https://www.amazon.in/s?k=iphone+15',        platform: 'Amazon',   price: 74999 },
          { name: 'Nike Air Max 270',   url: 'https://www.myntra.com/nike-air-max-270',     platform: 'Myntra',   price: 9995  },
          { name: 'Samsung Galaxy S24', url: 'https://www.flipkart.com/s?q=samsung+s24',   platform: 'Flipkart', price: 54999 }
        ],
        searchHistory: [
          { query: 'iphone 15',          bestPrice: 74999, resultCount: 4, searchedAt: new Date(Date.now() - 2 * 86400000) },
          { query: 'samsung galaxy s24', bestPrice: 54999, resultCount: 5, searchedAt: new Date(Date.now() - 5 * 86400000) },
          { query: 'nike air max',       bestPrice: 9995,  resultCount: 3, searchedAt: new Date(Date.now() - 7 * 86400000) }
        ]
      });
      log(`Demo user created  (${demoEmail} / password123)`);
    }
  } catch (e) {
    err(`User seed failed: ${e.message}`);
  }

  // ── Price History ─────────────────────────────────────────────────
  console.log('\n  [2/3] Seeding price history (30 days per product)...');
  const products = [
    { query: 'iphone 15',             basePrice: 74999 },
    { query: 'samsung galaxy s24',    basePrice: 54999 },
    { query: 'nike air max',          basePrice: 9995  },
    { query: 'sony wh1000xm5',        basePrice: 22990 },
    { query: 'apple watch series 9',  basePrice: 41900 }
  ];

  for (const p of products) {
    try {
      const count = await PriceHistory.countDocuments({ query: p.query });
      if (count > 0) {
        warn(`"${p.query}" — already has ${count} records, skipping`);
        continue;
      }
      const records = buildHistory(p.query, p.basePrice);
      await PriceHistory.insertMany(records);
      log(`"${p.query}" — ${records.length} price records inserted`);
    } catch (e) {
      err(`PriceHistory failed for "${p.query}": ${e.message}`);
    }
  }

  // ── Product Cache ─────────────────────────────────────────────────
  console.log('\n  [3/3] Seeding product cache...');
  for (const p of products.slice(0, 2)) {
    try {
      const exists = await Product.findOne({ query: p.query.toLowerCase() });
      if (exists) {
        warn(`Product cache for "${p.query}" already exists — skipping`);
        continue;
      }
      await Product.create({
        query: p.query.toLowerCase(),
        results: [
          { store: 'Amazon',   price: Math.round(p.basePrice),        url: `https://www.amazon.in/s?k=${encodeURIComponent(p.query)}` },
          { store: 'Flipkart', price: Math.round(p.basePrice * 1.02), url: `https://www.flipkart.com/s?q=${encodeURIComponent(p.query)}` },
          { store: 'Myntra',   price: null, url: '' },
          { store: 'Ajio',     price: null, url: '' },
          { store: 'Meesho',   price: Math.round(p.basePrice * 0.96), url: `https://www.meesho.com/search?q=${encodeURIComponent(p.query)}` }
        ],
        bestPrice:   Math.round(p.basePrice * 0.96),
        lowestStore: 'Meesho',
        cachedAt:    new Date()
      });
      log(`Product cache created for "${p.query}"`);
    } catch (e) {
      err(`Product cache failed for "${p.query}": ${e.message}`);
    }
  }

  console.log(`\n${G}${B}===================================================${X}`);
  console.log(`${G}${B}  ✔  Seed completed! Database is ready.           ${X}`);
  console.log(`${G}${B}===================================================${X}\n`);

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch(e => { err(`Unexpected: ${e.message}`); process.exit(1); });
