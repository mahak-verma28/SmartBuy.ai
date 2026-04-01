const express = require('express');
const router = express.Router();
const User = require('../../DataBase/models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/history
// @desc    Get user search history
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      // Return history sorted by newest first
      const history = user.searchHistory.sort((a, b) => b.searchedAt - a.searchedAt);
      res.json(history);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/history
// @desc    Add query to search history
// @access  Private
router.post('/', protect, async (req, res) => {
  const { query } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (user) {
      const newItem = { query, searchedAt: new Date() };
      user.searchHistory.push(newItem);
      
      // Optionally prune history to last 50 items?
      if (user.searchHistory.length > 50) {
        user.searchHistory.shift(); // remove oldest
      }

      await user.save();
      
      const addedItem = user.searchHistory[user.searchHistory.length - 1];
      res.status(201).json(addedItem);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
