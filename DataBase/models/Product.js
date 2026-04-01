const mongoose = require('mongoose');

// ── Per-store result sub-schema ───────────────────────────────────────
const StoreResultSchema = new mongoose.Schema({
  store:      { type: String, required: true },   // 'Amazon', 'Flipkart', etc.
  price:      { type: Number, default: null },
  url:        { type: String, default: '' },
  scrapedAt:  { type: Date,   default: Date.now }
}, { _id: false });

// ── Product / Search Cache Schema ─────────────────────────────────────
const ProductSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  results: {
    type: [StoreResultSchema],
    default: []
  },
  bestPrice: {
    type: Number,
    default: null
  },
  lowestStore: {
    type: String,
    default: null
  },
  // TTL index — document auto-deleted after 1 hour of being cached
  cachedAt: {
    type: Date,
    default: Date.now,
    expires: 3600   // seconds (1 hour)
  }
}, {
  timestamps: true
});

// ── Instance method: get valid (non-null) results ─────────────────────
ProductSchema.methods.getValidResults = function () {
  return this.results.filter(r => r.price !== null);
};

module.exports = mongoose.model('Product', ProductSchema);
