const { Router } = require('express');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.get('/me/stats', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ username: user.username, stats: user.stats });
});

module.exports = router;
