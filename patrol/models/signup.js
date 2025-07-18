const mongoose = require("mongoose");

const SignupSchema = new mongoose.Schema({
    username: { type: String, required: true, unique:false },
      value: { type: Number, default: 0 },
    password: { type: String, required: true },
    patrolGuardName: { type: String, required: true },
    userId: { type: String,unique:true },
    mobileNumber: { type: String, required: true },
    email: { type: String, required: true, unique: false },
    department:{type:String},
    designation:{type:String},
    locationId:[{type:String}],
     locationName: [{type: String}],
    companyCode: { type: String, required: false }, // Links to Company Master
    imageUrl: { type: String },
    role: { type:String, required: false },
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

