const mongoose = require('mongoose');
const express = require("express") 
const router = express.Router()

const roleSchema = new mongoose.Schema({
    roleId:{type:String,unique:true},
    roleName:{type:String},
    description:{type:String},
    isActive: { type: Boolean, default: true },
    createdDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date, default: Date.now }
});
module.exports = mongoose.model("Roles", roleSchema, "role");