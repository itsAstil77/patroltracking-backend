const mongoose = require("mongoose");

const SignupSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    patrolGuardName: { type: String, required: true },
    patrolId: { type: String },
    adminId:{type:String },
    mobileNumber: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    department:{type:String},
    designation:{type:String},
    companyCode: { type: String, required: true }, // Links to Company Master
    imageUrl: { type: String },
    role: { type: String, enum: ["Patrol", "Admin"], required: true },
    createdBy: {type:String},
    createdDate: { type: Date, default: Date.now },
    modifiedBy:{type:String},
    modifiedDate: { type: Date, default: Date.now },
    otp: { type: String },  // ✅ Store OTP as String
    otpExpires: { type: Number },
    isActive: { type: Boolean, default: true }
});

// ✅ Export the Signup model
module.exports = mongoose.model("Signup", SignupSchema);

