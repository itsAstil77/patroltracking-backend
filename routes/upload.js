// const express = require("express");
// const multer = require("multer");
// const mongoose = require("mongoose");
// const path = require("path");
// const fs = require("fs").promises;

// const router = express.Router();

// // Schema Definition
// const mediaSchema = new mongoose.Schema({
//   checklistId: { type: String, required: true },
//   mediaType: { type: String, enum: ["Image", "Video", "Audio", "Text"], required: true },
//   mediaPath: { type: String }, // For file uploads
//   textContent: { type: String }, // For text messages
//   uploadedBy: { type: String, required: true },
//   uploadedDate: { type: Date, default: Date.now },
// });

// const Media = mongoose.model("Media", mediaSchema);

// // Multer File Filter for Validation
// const fileFilter = (req, file, cb) => {
//   const { mediaType } = req.body;
//   if (!mediaType) return cb(new Error("❌ mediaType is required"), false);

//   const imageTypes = ["image/jpeg", "image/png", "image/gif"];
//   const videoTypes = ["video/mp4", "video/mkv", "video/avi"];
//   const audioTypes = ["audio/mpeg", "audio/wav"];
//   const textTypes = ["text/plain", "application/pdf", "application/msword"];

//   if (mediaType === "Image" && imageTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else if (mediaType === "Video" && videoTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else if (mediaType === "Audio" && audioTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else if (mediaType === "Text" && textTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error(`❌ Invalid file type for ${mediaType}. Allowed: ${{
//       Image: "JPG, PNG, GIF",
//       Video: "MP4, MKV, AVI",
//       Audio: "MP3, WAV",
//       Text: "TXT, PDF, DOCX",
//     }[mediaType]}`), false);
//   }
// };

// // Multer Storage Config
// const storage = multer.diskStorage({
//   destination: async (req, file, cb) => {
//     try {
//       const { checklistId, mediaType } = req.body;
//       if (!checklistId || !mediaType) return cb(new Error("❌ Checklist ID and mediaType are required"));

//       const uploadFolder = path.join(__dirname, `uploads/checklists/${checklistId}/${mediaType}`);
//       await fs.mkdir(uploadFolder, { recursive: true });

//       cb(null, uploadFolder);
//     } catch (err) {
//       cb(err);
//     }
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname));
//   },
// });

// const upload = multer({ storage, fileFilter });

// // Upload Media API (Supports Text Messages)
// router.post("/upload", upload.single("file"), async (req, res) => {
//   try {
//     const { checklistId, mediaType, uploadedBy, textContent } = req.body;

//     if (!checklistId || !mediaType || !uploadedBy) {
//       return res.status(400).json({ error: "❌ Missing required fields" });
//     }

//     let mediaData = { checklistId, mediaType, uploadedBy };

//     if (mediaType === "Text") {
//       if (!textContent || textContent.trim() === "") {
//         return res.status(400).json({ error: "❌ Text content cannot be empty" });
//       }
//       mediaData.textContent = textContent;
//     } else {
//       if (!req.file) {
//         return res.status(400).json({ error: "❌ File is required for this media type" });
//       }
//       mediaData.mediaPath = req.file.path;
//     }

//     const media = new Media(mediaData);
//     await media.save();

//     res.json({ message: "✅ Media uploaded successfully", media });
//   } catch (error) {
//     console.error("❌ Error:", error.message);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Get Media by Checklist ID
// router.get("/:checklistId", async (req, res) => {
//   try {
//     const mediaFiles = await Media.find({ checklistId: req.params.checklistId });
//     if (!mediaFiles.length) return res.status(404).json({ message: "No media found for this checklist" });

//     res.json(mediaFiles);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// module.exports = router;
