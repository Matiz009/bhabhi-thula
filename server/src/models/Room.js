const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    username: { type: String, required: true },
    isBot: { type: Boolean, default: false },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    hostUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    maxPlayers: { type: Number, default: 4 },
    seats: { type: [seatSchema], default: [] },
    status: { type: String, enum: ['waiting', 'in-progress', 'finished'], default: 'waiting' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
