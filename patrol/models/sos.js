const mongoose = require('mongoose');
const express = require("express") 
const router = express.Router()
const sosSchema = new mongoose.Schema({
    userId:{type:String},
    remarks:{type:String},
    coordinates:{type:String},
    createdDate: { type: Date, default: Date.now },
})
module.exports= mongoose.model('Sos',sosSchema,'sos')