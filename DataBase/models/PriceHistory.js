const mongoose = require('mongoose');

// ── Price History Schema ───────────────────────────────────────────────
// Records every price observation per product+store so the Analytics
// chart can show a real historical trend instead of mocked data.
const PriceHistorySchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  store: {
    type: String,
    required: true,
    enum: ['Amazon', 'Flipkart', 'Myntra', 'Ajio', 'Meesho']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  url: {
    type: String,
    default: ''
  },
  recordedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false   // recordedAt is our own timestamp
});

// ── Indexes for fast chart queries ─────────────────────────────────────
PriceHistorySchema.index({ query: 1, store: 1, recordedAt: -1 });
PriceHistorySchema.index({ query: 1, recordedAt: -1 });

// ── Static: get history for a query (last N days) ─────────────────────
PriceHistorySchema.statics.getHistory = function (query, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({
    query: query.toLowerCase(),
    recordedAt: { $gte: since }
  }).sort({ recordedAt: 1 });
};

// ── Static: get cheapest per store for a query ────────────────────────
PriceHistorySchema.statics.getBestPerStore = function (query) {
  return this.aggregate([
    { $match: { query: query.toLowerCase() } },
    { $sort:  { recordedAt: -1 } },
    {
      $group: {
        _id:   '$store',
        price: { $first: '$price' },
        url:   { $first: '$url' },
        date:  { $first: '$recordedAt' }
      }
    },
    { $sort: { price: 1 } }
  ]);
};

module.exports = mongoose.model('PriceHistory', PriceHistorySchema, 'pricehistory');
