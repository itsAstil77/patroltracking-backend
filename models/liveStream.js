const mongoose = require('mongoose');

const liveStreamSchema = new mongoose.Schema({
  streamId: { type: String, required: true, unique: true },
  startedBy: { type: String, required: true }, 
  role: { type: String, required: true },
  location: { type: String },
  isLive: { type: Boolean, default: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('LiveStream', liveStreamSchema);
