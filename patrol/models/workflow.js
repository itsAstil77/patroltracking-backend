const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  workflowId: { type: String, required: true, unique: true }, // Custom event ID
  workflowTitle: { type: String, required: true },
  // locationCode: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ["Pending", "Inprogress","Completed"] },
  assignedStart:{type:Date},
  assignedEnd:{type:Date},
  createdBy: { type: String, required: true },
  createdDate: { type: Date, default: Date.now },
  modifiedBy:{type:String},
  modifiedDate: { type: Date, default: Date.now },
  startDateTime: { type: Date }, 
  endDateTime: { type: Date }, 
  workflowStatus:{type:String,enum:["Ontime","Late"]},
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model("Event", eventSchema,'workflow');
