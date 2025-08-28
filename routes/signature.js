const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Signature = require("../models/signature");
const Signup = require("../models/signup");
const Checklist = require("../models/checklist");
const authMiddleware = require('../middleware/authMiddleware');
const generateSignatureId = require("../utils/generateSignatureId");


// Create uploads folder if not exists
const signatureDir = path.join(__dirname, "..", "uploads", "signatures");
if (!fs.existsSync(signatureDir)) {
  fs.mkdirSync(signatureDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, signatureDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/png", "image/jpeg", "image/jpg"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only image files allowed"), false);
};

const upload = multer({ storage, fileFilter });

// POST /signature
router.post("/",authMiddleware, upload.single("signatureImage"), async (req, res) => {
  try {
    const { userId, checklistId } = req.body;

    if (!req.file) return res.status(400).json({ error: "Image is required." });

    const userExists = await Signup.findOne({ userId });
    // const checklistExists = await Checklist.findOne({ checklistId });
    let checklistExists = null;
    if (checklistId) {
      checklistExists = await Checklist.findOne({ checklistId });
      if (!checklistExists) {
        return res.status(400).json({ error: "Invalid checklistId." });
      }
    }
    
    if (!userExists) return res.status(400).json({ error: "Invalid user." });
    // if (!checklistExists) return res.status(400).json({ error: "Invalid checklistId." });

    const now = new Date();
    const time = now.toTimeString().split(" ")[0]; // HH:MM:SS

    const signatureId = await generateSignatureId();
    const newSig = new Signature({
      signatureId,
      signatureUrl: `${req.protocol}://${req.get('host')}/uploads/signatures/${req.file.filename}`,
      userId,
      checklistId : checklistId || null,
      createdDate: now,
      createdTime: time,
      modifiedDate: now,
      modifiedTime: time
    });

    await newSig.save();
    res.status(200).json({ message: "Signature saved", data: newSig });

  } catch (err) {
    console.error("Signature upload error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
