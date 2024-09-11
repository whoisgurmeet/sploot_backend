const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  day: String,
  workingHours: [
    {
      startTime: Number ,
      endTime: Number
    }
  ]
});

const partnerSchema = new mongoose.Schema({
  name: String,
  schedule: [scheduleSchema],
  city : String,
  State : String ,
  createdAt: {
    type: Date,
    default: Date.now 
  }

});

module.exports = mongoose.model('Partner', partnerSchema);
