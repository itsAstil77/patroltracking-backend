const express = require("express");
const crypto = require("crypto");
const License = require("../models/license");
const router = express.Router();

// Register License
router.post("/register", async (req, res) => {
  try {
    const { serialNumber, deviceId } = req.body;

    if (!serialNumber || !deviceId) {
      return res.status(400).json({ message: "serialNumber and deviceId are required" });
    }

    const existing = await License.findOne({ serialNumber, deviceId });
    if (existing) {
      return res.status(400).json({ message: "License already exists" });
    }

    const uniqueKey = crypto.randomBytes(16).toString("hex");

    const newLicense = new License({ serialNumber, deviceId, uniqueKey });
    await newLicense.save();

    res.status(200).json({ message: "License registered", uniqueKey });
  } catch (err) {
    res.status(500).json({ message: "Error registering license", error: err.message });
  }
});

// Validate License
router.post("/validate", async (req, res) => {
  try {
    const { serialNumber, deviceId, uniqueKey } = req.body;

    const license = await License.findOne({ serialNumber, deviceId, uniqueKey, isActive: true });

    if (license) {
      return res.status(200).json({ authorized: true });
    } else {
      return res.status(401).json({ authorized: false, message: "Invalid license" });
    }
  } catch (err) {
    res.status(500).json({ message: "Error validating license", error: err.message });
  }
});

module.exports = router;
