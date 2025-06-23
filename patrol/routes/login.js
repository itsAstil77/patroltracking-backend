const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const Signup = require("../models/signup");
require("dotenv").config();

const router = express.Router();

// // ✅ Configure Nodemailer
// const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//         user: process.env.EMAIL_USER, 
//         pass: process.env.EMAIL_PASS, 
//     },
// });

// ✅ Configure Nodemailer
// --- CHANGE STARTS HERE ---
const transporter = nodemailer.createTransport({
    // Replace "gmail" service with explicit host, port, and secure settings
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT), // Convert port to a number
    secure: process.env.SMTP_SECURE === 'true', // Convert string "true"/"false" to boolean
    auth: {
        user: process.env.EMAIL_USER, // Your SMTP authentication username from .env
        pass: process.env.EMAIL_PASS, // Your SMTP authentication password from .env
    },
    // Add debug and logger for troubleshooting SMTP conversation
    // debug: true, // IMPORTANT: Set to true for debugging
    // logger: true, // IMPORTANT: Set to true for debugging
});

// Add console logs here to verify the values passed to nodemailer
// console.log("--- Nodemailer Config Check in login.js ---");
// console.log(Configured Host: ${process.env.SMTP_HOST});
// console.log(Configured Port: ${parseInt(process.env.SMTP_PORT)});
// console.log(Configured Secure: ${process.env.SMTP_SECURE === 'true'});
// console.log(Configured User: ${process.env.EMAIL_USER});
// console.log(Configured Pass (first 3 chars): ${process.env.EMAIL_PASS ? process.env.EMAIL_PASS.substring(0, 3) + '...' : 'NOT LOADED'});
// console.log("-----------------------------------------");

// --- CHANGE ENDS HERE ---

// ✅ Generate a 4-digit OTP
// const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();
const generateOTP = () => "9628"; // Or any 4-digit code you prefer


// ✅ Step 1: Login API - Verify Credentials & Send OTP
router.post("/", async (req, res) => {
    try {
        const { username, password } = req.body;

        // ✅ Find User by username or email
        const user = await Signup.findOne({ $or: [{ username }, { email: username }] });
        if (!user) return res.status(400).json({ message: "Invalid username or password" });

        // ✅ Compare Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid username or password" });

        // ✅ Generate OTP & Save to DB
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpires = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes
        await user.save();

        // ✅ Send OTP Email
        console.log(`🔑 OTP for ${user.email}: ${otp}`);
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "Your Login OTP",
            text: `Your OTP for login is: ${otp}. It is valid for 5 minutes.`,
        };
        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: "OTP sent to your email" ,otp,role:user.role});

    } catch (error) {
        console.error("❌ Error during login:", error);
        res.status(500).json({ message: "Error during login", error: error.message });
    }
});

// ✅ Step 2: OTP Verification & JWT Token Generation
router.post("/verify-otp", async (req, res) => {
    try {
        const { username, otp } = req.body;

        // ✅ Find User
        const user = await Signup.findOne({ $or: [{ username }, { email: username }] });
        if (!user) return res.status(400).json({ message: "User not found" });

        console.log(`Verifying OTP for ${user.username}...`);
        
        // ✅ Check OTP Expiry
        if (!user.otp || user.otp !== otp || Date.now() > Number(user.otpExpires)) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // ✅ Clear OTP from DB
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        // ✅ Generate JWT Token (Valid for 2 Hours)
        const token = jwt.sign(
            { 
                id: user.userId, 
                username: user.username, 
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );

        console.log(`✅ Login successful for: ${user.username}`);

        // ✅ Send response with the correct ID field
        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                userId: user.userId,
                username: user.username,
                patrolGuardName: user.patrolGuardName,
                mobileNumber: user.mobileNumber,
                email: user.email,
                companyCode: user.companyCode,
                imageUrl: user.imageUrl,
                role: user.role,
                createdDate: user.createdDate,
                modifiedDate: user.modifiedDate,
                isActive: user.isActive,
            },
        });

    } catch (error) {
        console.error("❌ Error verifying OTP:", error);
        res.status(500).json({ message: "Error verifying OTP", error: error.message });
    }
});

module.exports = router;
