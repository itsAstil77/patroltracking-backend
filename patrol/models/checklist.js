
const mongoose = require('mongoose');

const checklistSchema = new mongoose.Schema({
  checklistId: { type: String, required: true, unique: true },
  workflowId: { type: String, required: true },
  locationCode: { type: String, required: true },
  title: { type: String, required: true },
  remarks: { type: String },
  status: { type: String, enum: ['Unassigned', 'Open', 'Completed'], default: 'Unassigned' },
  assignedTo: { type: String },
  assignedBy: { type: String},
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

