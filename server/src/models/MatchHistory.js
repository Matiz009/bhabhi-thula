const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    username: { type: String, required: true },
    isBot: { type: Boolean, default: false },
    isBhabhi: { type: Boolean, default: false },
  },
  { _id: false }
);

const matchHistorySchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    roomName: { type: String, required: true },
    participants: { type: [participantSchema], default: [] },
    bhabhiUsername: { type: String, default: null },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MatchHistory', matchHistorySchema);
