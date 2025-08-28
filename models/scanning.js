const mongoose = require('mongoose');
const express = require("express") 
const router = express.Router()

const scanningSchema = new mongoose.Schema({
    scanId: { type: String, required: true, unique: true },
    scanType: { type: String, required: true, enum:["QR","Barcode","NFC"]}, // Example: QR, Barcode, RFID
    checklistId: { type: String, required: true },
    // patrolId: { type: String, required: true }, // Links to Patrol collection
    scanStartDate: { type: Date, required: true },
    status: { type: String, required: true, enum: ["Success", "Failed", "Pending"] },
    createdBy:{type:String},
    createdDate: { type: Date, default: Date.now },
    coordinates:{type:String},
    modifiedBy:{type:String},
    modifiedDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
});


module.exports = mongoose.model('Scanning', scanningSchema,'scanning');
