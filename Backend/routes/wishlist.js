const express = require('express');
const router  = express.Router();
const User    = require('../../DataBase/models/User');
const { protect } = require('../middleware/auth');

// ── GET /api/wishlist — Get user's wishlist ───────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('wishlist');
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Return newest items first
    const sorted = [...user.wishlist].sort((a, b) => b.addedAt - a.addedAt);
    res.json(sorted);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── POST /api/wishlist — Add item to wishlist ─────────────────────────
router.post('/', protect, async (req, res) => {
  const { name, url, platform, price, image } = req.body;

  if (!name || !url) {
    return res.status(400).json({ message: 'name and url are required' });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Prevent duplicate URLs in wishlist
    const alreadyExists = user.wishlist.some(item => item.url === url);
    if (alreadyExists) {
      return res.status(409).json({ message: 'Item already in wishlist' });
    }

    const newItem = {
      name,
      url,
      platform: platform || 'Other',
      price:    price    || null,
      image:    image    || null,
      addedAt:  new Date()
    };
    user.wishlist.push(newItem);
    await user.save();

    const addedItem = user.wishlist[user.wishlist.length - 1];
    res.status(201).json(addedItem);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── DELETE /api/wishlist/:id — Remove item from wishlist ──────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const before = user.wishlist.length;
    user.wishlist = user.wishlist.filter(item => item._id.toString() !== req.params.id);

    if (user.wishlist.length === before) {
      return res.status(404).json({ message: 'Item not found in wishlist' });
    }

    await user.save();
    res.json({ message: 'Item removed from wishlist' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
