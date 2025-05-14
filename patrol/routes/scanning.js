const express = require("express");
const router = express.Router();
const Scanning = require("../models/scanning");
// const Event = require("../models/workflow"); // Make sure this exists
const Checklist = require('../models/checklist');
const authMiddleware = require("../middleware/authMiddleware");

// Generate the next scanId (SCN001, SCN002, etc.)
async function generateScanningId() {
  const lastScan = await Scanning.findOne().sort({ createdDate: -1 });
  if (!lastScan) {
    return "SCN001";
  }
  const lastId = lastScan.scanId;
  const number = parseInt(lastId.replace("SCN", ""), 10) + 1;
  return "SCN" + number.toString().padStart(3, "0");
}

// POST /scanning
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { scanType, checklistId } = req.body;

    // Validate required fields
    if (!scanType || !checklistId) {
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

    // Generate scanId
    const scanId = await generateScanningId();

    // // Get current date and time
    // const now = new Date();
    // const scanDate = now;
    // const scanTime = now.toTimeString().split(" ")[0]; // "HH:MM:SS"
    const scanStartDate = new Date(); // 

    // Create scan entry
    const newScan = new Scanning({
      scanId,
      scanType,
      checklistId,
      scanStartDate,
      status: "Success",
      createdBy: req.user?.username || "System", // optional: from authMiddleware
      modifiedBy: req.user?.username || "System"
    });

    await newScan.save();
        // Update the checklist with the scanStartDate
        await Checklist.findOneAndUpdate(
          { checklistId },
          { $set: { scanStartDate: scanStartDate } }, // Assuming you're adding this field in the Checklist collection
          { new: true }
        );
    
        res.status(200).json({ message: "Scan recorded and checklist updated successfully", data: newScan });

  } catch (error) {
    console.error("Error saving scan:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
