const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Multimedia = require("../models/media");
// const Scanning = require("../models/scanning");
const Signup = require("../models/signup");
const Checklist = require('../models/checklist');
const authMiddleware = require('../middleware/authMiddleware');

// Ensure uploads/media directory exists
const uploadDir = path.join(__dirname, "..", "uploads", "media");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

// File type validation based on mediaType
function fileFilter(req, file, cb) {
  const mediaType = req.body.mediaType;

  const imageMimeTypes = ["image/jpeg", "image/png", "image/jpg"];
  const videoMimeTypes = ["video/mp4", "video/mpeg", "video/avi", "video/webm"];
  const audioMimeTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/webm"];  
  

  let isValid = false;

  if (mediaType === "image") {
    isValid = imageMimeTypes.includes(file.mimetype);
  } else if (mediaType === "video") {
    isValid = videoMimeTypes.includes(file.mimetype);
  } else if (mediaType === "audio") {
    isValid = audioMimeTypes.includes(file.mimetype);
  }

  if (!isValid) {
    return cb(new Error("Invalid media type or file format."), false);
  }

  cb(null, true);
}

const upload = multer({ storage, fileFilter,  limits: { fileSize: 5 * 1024 * 1024 } });

// Utility: Generate multimediaId
async function generateMultimediaId() {
  const last = await Multimedia.findOne().sort({ createdDate: -1 }).limit(1);
  if (!last || !last.multimediaId || !/^MMD\d+$/.test(last.multimediaId)) {
    return "MMD001";
  }

  const lastNum = parseInt(last.multimediaId.replace("MMD", ""), 10);
  return "MMD" + (lastNum + 1).toString().padStart(3, "0");
}

// POST /multimedia
// Wrapper for multer error handling
router.post("/",(req, res) => {
    upload.single("mediaFile")(req, res, async (err) => {
      if (err instanceof multer.MulterError || err) {
        // Handle Multer-specific or file validation errors
        return res.status(400).json({ error: err.message });
      }
  
      try {
        const { mediaType, description, patrolId, createdBy, modifiedBy,checklistId } = req.body;
  
        if (!req.file) {
          return res.status(400).json({ error: "Media file is required." });
        }
  
        const validPatrol = await Signup.findOne({ patrolId });
        const validCreator = await Signup.findOne({ patrolId: createdBy });
        // const validChecklist = await Checklist.findOne({ checklistId});
  
        if (!validPatrol) return res.status(400).json({ error: "Invalid patrolId." });
        if (!validCreator) return res.status(400).json({ error: "Invalid createdBy." });
        // if (!validChecklist) return res.status(400).json({ error: "Invalid checklistId or checklist is inactive." });
  
        // const scanExists = await Scanning.findOne({ patrolId });
        // if (!scanExists) {
        //   return res.status(400).json({ error: "Media upload allowed only after successful scan." });
        // }

        if (checklistId) {
          const validChecklist = await Checklist.findOne({ checklistId, isActive: true });
          if (!validChecklist) {
            return res.status(400).json({ error: "Invalid checklistId or checklist is inactive." });
          }
        }
  
        const multimediaId = await generateMultimediaId();
  
        const newMedia = new Multimedia({
          multimediaId,
          mediaUrl: `${req.protocol}://${req.get("host")}/uploads/media/${req.file.filename}`,
          mediaType,
          description,
          patrolId,
          checklistId : checklistId || null,
          createdBy,
          modifiedBy
        });
  
        await newMedia.save();
        res.status(200).json({ message: "Multimedia uploaded successfully", data: newMedia });
  
      } catch (error) {
        console.error("Error uploading media:", error);
        res.status(500).json({ error: "Server error" });
      }
    });
  });
  

module.exports = router;
