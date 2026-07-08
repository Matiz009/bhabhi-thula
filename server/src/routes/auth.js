const { Router } = require('express');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');

const router = Router();

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }

  const existing = await User.findOne({ $or: [{ username }, { email: email.toLowerCase() }] });
  if (existing) {
    return res.status(409).json({ error: 'username or email already in use' });
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ username, email, passwordHash });

  const token = signToken({ sub: user._id.toString(), username: user.username });
  res.status(201).json({ token, user: user.toPublicJSON() });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const user = await User.findOne({
    $or: [{ username }, { email: username.toLowerCase() }],
  });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken({ sub: user._id.toString(), username: user.username });
  res.json({ token, user: user.toPublicJSON() });
});

module.exports = router;
