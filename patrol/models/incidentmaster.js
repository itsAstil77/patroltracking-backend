// models/incident.js
const mongoose = require('mongoose');

const incidentMasterSchema = new mongoose.Schema({
  incident: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  severity: {
    type: String,
    enum: ['Low', 'Moderate', 'Major', 'Critical'],
    required: true
  },
  createdDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('IncidentMaster', incidentMasterSchema,'incidentmaster');
