const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const Signup = require("../models/signup");
require("dotenv").config();

const router = express.Router();

// ✅ Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
    },
});

// ✅ Generate a 4-digit OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

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
                id: user.role === "Patrol" ? user.patrolId : user.adminId, 
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
                id: user.role === "Patrol" ? user.patrolId : user.adminId,  // Only send relevant ID
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
