
const mongoose = require('mongoose');

const checklistSchema = new mongoose.Schema({
  checklistId: { type: String, required: true, unique: true },
  workflowId: { type: String, required: true },
  locationName: [{ type: String, required: false }],
  locationCode: [{ type: String }],
  title: { type: String, required: true },
  remarks: { type: String },
  status: { type: String, enum: ['Unassigned', 'Open', 'Completed','Completed with MME'], default: 'Unassigned' },
  assignedTo: [{ type: String }],
  assignedBy: { type: String},
  coordinates:{type:String},
geoCoordinates: {
  type: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
},

  // endCoordinate:{type:String},
  // latitude: { type: Number},
  // longitude: { type: Number },
  // locationName:{type:String},
  // ETA:{type:String},
  startDateTime: { type: Date },
  endDateTime: { type: Date },
  createdDate: { type: Date, default: Date.now },
  modifiedDate: { type: Date, default: Date.now },
  createdBy: {type:String,required:true},
  modifiedBy:{type:String},
  isActive: { type: Boolean, default: true },
  scanStartDate: { type: Date },
  scanEndDate:{type:Date}
});

// Middleware to update 'modifiedDate' before saving
checklistSchema.pre('save', function(next) {
  this.modifiedDate = Date.now();
  next();
});

module.exports = mongoose.model('Checklist', checklistSchema,'checklists');

