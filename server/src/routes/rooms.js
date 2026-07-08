const { Router } = require('express');
const Room = require('../models/Room');
const { requireAuth } = require('../middleware/auth');
const gameManager = require('../GameManager');

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  res.json({ rooms: gameManager.listOpenRooms() });
});

router.post('/', requireAuth, async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Room name is required' });
  }

  const room = await Room.create({
    name: name.trim(),
    hostUser: req.user.id,
    seats: [{ userId: req.user.id, username: req.user.username, isBot: false }],
  });

  const liveRoom = gameManager.registerRoom({
    id: room._id.toString(),
    name: room.name,
    hostUserId: req.user.id,
    hostUsername: req.user.username,
  });

  res.status(201).json({ room: gameManager.roomSummary(liveRoom) });
});

module.exports = router;
