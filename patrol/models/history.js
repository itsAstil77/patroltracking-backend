const mongoose = require("mongoose");

const eventWebSchema = new mongoose.Schema({
  historyId: {type: String,unique: true,required: true,},
  // eventId:{type:String,required:true},
  date: {type: Date,required: true,},
  type: {type: String,enum: ["history", "media", "scan"],required: true},
  remarks: {type: String,required: true,},
  patrolId: {type: String,required: true,},
  checklistId: {type: String,required: true,},
  mediaUrl: {type: String,required: true,},
  createdBy:{type:String},
  // createdDate: {type: Date,default: Date.now,},
  modifiedBy:{type:String},
  // modifiedDate: {type: Date,default: Date.now,},
  isActive: {type: Boolean,default: true}},
  { timestamps: { createdAt: 'createdDate', updatedAt: 'modifiedDate' }
});

module.exports = mongoose.model("EventWeb", eventWebSchema,'history');
