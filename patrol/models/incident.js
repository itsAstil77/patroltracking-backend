const mongoose = require('mongoose');
const express = require("express")
const router = express.Router()
// const incidentSchema = new mongoose.Schema({
//     incidentCode: { type: String, required: true, unique: true },
//     title: { type: String, required: true },
//     description: { type: String },
//     createdDate: { type: Date, default: Date.now },
//     modifiedDate: { type: Date, default: Date.now },
//     isActive: { type: Boolean, default: true }
// });

const incidentSchema = new mongoose.Schema({
    incidentName: { type: String },
    // incidentCode: { type: String },
    severity: { type: String, enum: ['Low', 'Moderate', 'Major', 'Critical'] },
    type: { type: String, enum: ['incident','media'] ,default:'incident'},
    patrolId: { type: String, required: true },
    date: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  });

  module.exports =  mongoose.model('Incident', incidentSchema,'incidents');


  