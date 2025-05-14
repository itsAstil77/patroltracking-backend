// models/media.js
const mongoose = require('mongoose');

const multimediaSchema = new mongoose.Schema({
  multimediaId: { type: String, required: true, unique: true },
  mediaUrl: { type: String }, // This can be null initially
  mediaType: { type: String, required: true, enum: ['image', 'video', 'audio'] },
  description: { type: String },
  patrolId: { type: String, required: true },
  checklistId: { type: String, required: false }, 
  createdBy: { type: String, required: true },
  modifiedBy: { type: String },
  createdDate: { type: Date, default: Date.now },
  modifiedDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: 'modifiedDate' }
});

module.exports = mongoose.model('Multimedia', multimediaSchema, 'multimedia');
