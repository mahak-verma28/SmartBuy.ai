const express  = require('express');
const router   = express.Router();
const Alert    = require('../../DataBase/models/Alert');
const { protect } = require('../middleware/auth');

// ── POST /api/alerts — Create a price drop alert ──────────────────────
router.post('/', protect, async (req, res) => {
  const { query, targetPrice, currentPrice, preferredStore } = req.body;

  if (!query || targetPrice == null) {
    return res.status(400).json({ message: 'query and targetPrice are required' });
  }

  try {
    // Upsert: one active alert per user+query
    const alert = await Alert.findOneAndUpdate(
      { userId: req.user._id, query: query.trim(), isActive: true },
      {
        userId:          req.user._id,
        query:           query.trim(),
        targetPrice,
        currentPrice:    currentPrice || null,
        preferredStore:  preferredStore || 'Any',
        isTriggered:     false,
        triggeredAt:     null,
        triggeredPrice:  null,
        isActive:        true
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── GET /api/alerts — Get current user's alerts ───────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── DELETE /api/alerts/:id — Remove an alert ─────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({
      _id:    req.params.id,
      userId: req.user._id
    });
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    res.json({ message: 'Alert removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── PATCH /api/alerts/:id/deactivate — Deactivate alert ──────────────
router.patch('/:id/deactivate', protect, async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isActive: false },
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
