const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  partnerId: mongoose.Schema.Types.ObjectId,
  startDate: Date,
  endDate: Date,
  leaveSlots: [
    {
      startTimeMinutes: Number,
      endTimeMinutes: Number
    }
  ],
  status: String,
  createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Leave', leaveSchema);
