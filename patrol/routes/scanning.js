const express = require("express");
const router = express.Router();
const Scanning = require("../models/scanning");
// const Event = require("../models/workflow"); // Make sure this exists
const Checklist = require('../models/checklist');
const authMiddleware = require("../middleware/authMiddleware");
const generateScanningId = require("../utils/generateScanningId"); //


// POST /scanning
router.post("/",authMiddleware, async (req, res) => {
  try {
    const { scanType, checklistId, coordinates,scanStartDate } = req.body;

    // Validate required fields
    if (!scanType || !checklistId || !coordinates) {
      return res.status(400).json({ error: "scanType and checklistId are required" });
    }

    // Validate scanType value
    const allowedTypes = ["QR", "Barcode", "NFC"];
    if (!allowedTypes.includes(scanType)) {
      return res.status(400).json({ error: "Invalid scanType" });
    }

    // Validate eventId against Event collection
    const checklistMatch = await Checklist.findOne({ checklistId, isActive: true });
    if (!checklistMatch) {
      return res.status(400).json({ error: "No active checklist found with the given checklistId" });
    }

   const scanId = await generateScanningId();

    // // Get current date and time
    // const now = new Date();
    // const scanDate = now;
    // const scanTime = now.toTimeString().split(" ")[0]; // "HH:MM:SS"
   const scanStart = scanStartDate ? new Date(scanStartDate) : new Date();

    // Create scan entry
    const newScan = new Scanning({
      scanId,
      scanType,
      checklistId,
      coordinates,
      scanStartDate: scanStart,
      status: "Success",
      createdBy: req.user?.username || "System", // optional: from authMiddleware
      modifiedBy: req.user?.username || "System"
    });

    await newScan.save();
        // Update the checklist with the scanStartDate
       await Checklist.findOneAndUpdate(
  { checklistId },
  { $set: { scanStartDate: scanStart, coordinates: coordinates } },
  { new: true }
);

    
        res.status(200).json({ message: "Scan recorded and checklist updated successfully", data: newScan });

  } catch (error) {
    console.error("Error saving scan:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
