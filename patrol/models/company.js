const mongoose = require("mongoose");

const MasterSchema = new mongoose.Schema({
    companyCode: { type: String, required: true, unique: true }, // ✅ Auto-generated unique code
    companyName: { type: String, required: true },
    companyLocation: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    modifiedBy:{type:String},
    createdDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
});

// ✅ Export the Master model
module.exports = mongoose.model("Master", MasterSchema, "company");
