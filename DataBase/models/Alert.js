const mongoose = require('mongoose');

// ── Alert Schema ──────────────────────────────────────────────────────
// Stores user-created price drop alerts (wired to the "Set Price Drop
// Alert" button on the Analytics page).
const AlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  query: {
    type: String,
    required: true,
    trim: true
  },
  targetPrice: {
    type: Number,
    required: [true, 'Target price is required'],
    min: [0, 'Target price cannot be negative']
  },
  currentPrice: {
    type: Number,
    default: null   // price at the moment the alert was set
  },
  preferredStore: {
    type: String,
    enum: ['Amazon', 'Flipkart', 'Myntra', 'Ajio', 'Meesho', 'Any'],
    default: 'Any'
  },
  isTriggered: {
    type: Boolean,
    default: false
  },
  triggeredAt: {
    type: Date,
    default: null
  },
  triggeredPrice: {
    type: Number,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true  // createdAt + updatedAt
});

// ── Compound index: one alert per user+query combo ─────────────────────
AlertSchema.index({ userId: 1, query: 1 });
AlertSchema.index({ isActive: 1, isTriggered: 1 });   // for background checker

module.exports = mongoose.model('Alert', AlertSchema);
