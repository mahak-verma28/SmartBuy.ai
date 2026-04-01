const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Wishlist Item Sub-Schema ──────────────────────────────────────────
const WishlistItemSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  url:       { type: String, required: true },
  platform:  { type: String, enum: ['Amazon', 'Flipkart', 'Myntra', 'Ajio', 'Meesho', 'Other'], default: 'Other' },
  price:     { type: Number, default: null },      // price at time of adding
  image:     { type: String, default: null },      // product image URL
  addedAt:   { type: Date,   default: Date.now }
}, { _id: true });

// ── Search History Sub-Schema ─────────────────────────────────────────
const SearchHistoryItemSchema = new mongoose.Schema({
  query:       { type: String, required: true, trim: true },
  bestPrice:   { type: Number, default: null },    // best price found at search time
  resultCount: { type: Number, default: 0 },       // how many stores returned a price
  searchedAt:  { type: Date,   default: Date.now }
}, { _id: true });

// ── User Schema ───────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  name: {
    type: String,
    trim: true,
    default: null
  },
  age: {
    type: Number,
    min: [1, 'Age must be positive'],
    max: [120, 'Enter a valid age'],
    default: null
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
    default: 'Prefer not to say'
  },
  phone: {
    type: String,
    trim: true,
    default: null
  },
  profilePicture: {
    type: String,
    default: null
  },
  preferences: {
    categories:  { type: [String], default: [] },   // e.g. ['Electronics', 'Fashion']
    budgetMin:   { type: Number,   default: 0 },
    budgetMax:   { type: Number,   default: 100000 },
    currency:    { type: String,   default: 'INR' }
  },
  demoUser: {
    type: Boolean,
    default: false
  },
  wishlist:       { type: [WishlistItemSchema],      default: [] },
  searchHistory:  { type: [SearchHistoryItemSchema], default: [] }
}, {
  timestamps: true   // createdAt + updatedAt
});

// ── Indexes ───────────────────────────────────────────────────────────
// email is already indexed via unique:true on the field definition above
UserSchema.index({ 'wishlist._id': 1 });
UserSchema.index({ 'searchHistory._id': 1 });
UserSchema.index({ createdAt: -1 });

// ── Hash password before saving ───────────────────────────────────────
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ── Instance method: verify password ─────────────────────────────────
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ── Virtual: wishlist count ───────────────────────────────────────────
UserSchema.virtual('wishlistCount').get(function () {
  return this.wishlist.length;
});

module.exports = mongoose.model('User', UserSchema);
