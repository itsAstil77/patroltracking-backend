const mongoose = require('mongoose');
const express = require("express") 
const router = express.Router()

const signatureSchema = new mongoose.Schema({
  signatureId: { type: String, required: true, unique: true },
  signatureUrl: { type: String, required: true },
  patrolId: { type: String, required: true },
  checklistId: { type: String, required: false },
  createdDate: { type: Date, default: Date.now },
  createdTime: { type: String, required: true },
  modifiedDate: { type: Date, default: Date.now },
  modifiedTime: { type: String, required: true },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model("Signature", signatureSchema, "signatures");
