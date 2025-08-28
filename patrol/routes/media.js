const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const generateMultimediaId = require("../utils/generateMultimediaId");

const transporter = nodemailer.createTransport({
    // Replace "gmail" service with explicit host, port, and secure settings
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT), // Convert port to a number
    secure: process.env.SMTP_SECURE === 'true', // Convert string "true"/"false" to boolean
    auth: {
        user: process.env.ADMIN_EMAIL, // Your SMTP authentication username from .env
        pass: process.env.ADMIN_EMAIL_PASSWORD,
         // Your SMTP authentication password from .env
    },
    //  logger: true,
  // debug: true
    // Add debug and logger for troubleshooting SMTP conversation
    // debug: true, // IMPORTANT: Set to true for debugging
    // logger: true, // IMPORTANT: Set to true for debugging
});
// const transporter = nodemailer.createTransport({
//   service: "gmail", // ✅ Use built-in Gmail config
//   auth: {
//     user: process.env.ADMIN_EMAIL,         // e.g., your Gmail address
//     pass: process.env.ADMIN_EMAIL_PASSWORD // Gmail app password
//   }
// });



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

function fileFilter(req, file, cb) {
  const allowedMimeTypes = [
    "image/jpeg", "image/png", "image/jpg",
    "video/mp4", "video/mpeg", "video/avi", "video/webm",
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/webm", "audio/aac", "audio/x-aac"  
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type: ${file.originalname}`), false);
  }

  cb(null, true);
}


const MAX_FILES = 5; // or 10 if you want more
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // per file size limit: 5MB
    files: MAX_FILES           // max number of files
  }
});




// POST /multimedia
// Wrapper for multer error handling
router.post("/",(req, res) => {
    upload.array("mediaFile", MAX_FILES)(req, res, async (err) => {

      if (err instanceof multer.MulterError || err) {
        // Handle Multer-specific or file validation errors
        return res.status(400).json({ error: err.message });
      }
  
      try {
        const { mediaType, description, userId, createdBy, modifiedBy,checklistId,coordinates } = req.body;

   
  
             if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "At least one media file is required." });
      }
  
        // ✅ Ensure userId exists and is not an Admin
        const validUser = await Signup.findOne({ userId, role: { $ne: "Admin" }, isActive: true });
        if (!validUser) {
          return res.status(400).json({ error: "Invalid userId or user is an Admin." });
        }

        // ✅ Ensure createdBy exists and is not an Admin
        const validCreatedBy = await Signup.findOne({ userId: createdBy, role: { $ne: "Admin" }, isActive: true });
        if (!validCreatedBy) {
          return res.status(400).json({ error: "Invalid createdBy or createdBy is an Admin." });
        }

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
        else{
                    // If checklistId is not provided, coordinates must be present
          if (!coordinates || coordinates.trim() === "") {
            return res.status(400).json({ error: "Coordinates are required when checklistId is not provided." });
          }

        }

      const savedMedia = [];

      for (const file of req.files) {
        const multimediaId = await generateMultimediaId();
let detectedMediaType = "";
if (file.mimetype.startsWith("image/")) detectedMediaType = "image";
else if (file.mimetype.startsWith("video/")) detectedMediaType = "video";
else if (file.mimetype.startsWith("audio/")) detectedMediaType = "audio";

const newMedia = new Multimedia({
  multimediaId,
  mediaUrl: `${req.protocol}://${req.get("host")}/uploads/media/${file.filename}`,
  mediaType: detectedMediaType,
  description,
  userId,
  checklistId: checklistId || null,
  coordinates: checklistId ? undefined : coordinates,
  createdBy,
  modifiedBy,
});


        await newMedia.save();
        savedMedia.push(newMedia);
      }
              // If media uploaded with checklistId, send email to admin(s)
      if (checklistId) {
        // Find all admins
        const admins = await Signup.find({ role: "Admin", isActive: true });

        const checklistInfo = await Checklist.findOne({ checklistId });

        for (const admin of admins) {
          const mailOptions = {
            from: process.env.ADMIN_EMAIL,
            to: admin.email,  // admin email
            subject: `Media uploaded for Checklist ${checklistId}`,
            html: `
              <p>Patrol with ID: <b>${userId}</b> has uploaded media for checklist: <b>${checklistId}</b>.</p>
              <p>Checklist Title: <b>${checklistInfo?.title || 'N/A'}</b></p>
              <p>Media Type: <b>${mediaType}</b></p>
              <p>Description: <i>${description || 'No description'}</i></p>
              <p>Media URLs:</p>
              <ul>
                ${savedMedia.map(m => `<li><a href="${m.mediaUrl}">${m.mediaUrl}</a></li>`).join("")}
              </ul>

              <p>Uploaded on: ${new Date().toLocaleString()}</p>
            `,
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error("Error sending media upload email:", error);
            } else {
              console.log("Email sent to admin:", info.response);
            }
          });
        }
      }
        res.status(200).json({ message: "Multimedia uploaded successfully", data: savedMedia });
  
      } catch (error) {
        console.error("Error uploading media:", error);
        res.status(500).json({ error: "Server error" });
      }
    });
  });
  

module.exports = router;
