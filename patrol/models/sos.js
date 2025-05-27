const mongoose = require('mongoose');
const express = require("express") 
const router = express.Router()
const sosSchema = new mongoose.Schema({
    userId:{type:String},
    remarks:{type:String},
    coordinates:{type:String}
})
module.exports= mongoose.model('Sos',sosSchema,'sos')