const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const EventWeb = require("../models/history");  // The model for 'history'
const Checklist = require("../models/checklist");  // Assuming checklist collection
const authMiddleware = require("../middleware/authMiddleware");

// Ensure uploads/history folder exists
const uploadDir = path.join(__dirname, "..", "uploads", "history");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

// Updated file filter (no `type` needed)
const fileFilter = (req, file, cb) => {
  // Log the file MIME type for debugging purposes
  console.log('Uploaded file MIME type:', file.mimetype);

  const mimeTypes = {
    "image/jpeg": true,
    "image/png": true,
    "image/jpg": true,
    "audio/mpeg": true,
    "audio/wav": true,
    "audio/mp3": true,
    "video/mp4": true,
    "video/mpeg": true,
    "video/webm": true,
  };

  if (mimeTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file format."), false);
  }
};

const upload = multer({ storage, fileFilter });

// Utility to auto-generate historyId
const generateHistoryId = async () => {
  const latest = await EventWeb.findOne().sort({ createdDate: -1 });
  let nextNumber = 1;

  if (latest && latest.historyId) {
    const match = latest.historyId.match(/\d+/);
    if (match) nextNumber = parseInt(match[0]) + 1;
  }

  return "HIS" + String(nextNumber).padStart(3, "0");
};

// POST /eventweb/create-history
router.post("/", authMiddleware, upload.single("mediaFile"), async (req, res) => {
  try {
    const { type, remarks, patrolId, checklistId, createdBy, modifiedBy } = req.body;

    // Check file
    if (!req.file) {
      return res.status(400).json({ error: "Media file is required." });
    }

    // Validate patrolId and checklistId
    // Validate patrolId and checklistId, assuming 'assignedTo' stores patrolId in Checklist
const validChecklist = await Checklist.findOne({ checklistId, assignedTo: patrolId });
if (!validChecklist) {
  return res.status(400).json({ error: "Invalid checklistId or patrolId." });
}


    // Generate historyId
    const historyId = await generateHistoryId();

    // Save record
    const newHistory = new EventWeb({
      historyId,
      date: new Date(),
      type,
      remarks,
      patrolId,
      checklistId,
      mediaUrl: `${req.protocol}://${req.get("host")}/uploads/history/${req.file.filename}`,
      createdBy,
      modifiedBy,
    });

    await newHistory.save();

    res.status(200).json({ message: "History record created successfully", data: newHistory });

  } catch (err) {
    console.error("Error in /history:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
