const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  locationId: { type: String, required: true, unique: true },
  locationCode: { type: String, required: true, unique: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  createdBy: {type:String,required:true},
  createdDate: { type: Date, default: Date.now },
  modifiedBy:{type:String},
  description: { type: String },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: { createdAt: 'createdDate', updatedAt: 'modifiedDate' }
});

module.exports = mongoose.model('Location', locationSchema,'locationCodeMaster');