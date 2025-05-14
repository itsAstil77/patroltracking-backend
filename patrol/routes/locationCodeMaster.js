const express = require('express');
const router = express.Router();
const Location = require('../models/locationCodeMaster');
const Signup = require("../models/signup"); // ✅ Import Signup model

const authMiddleware = require('../middleware/authMiddleware'); // Import auth middleware

// Function to generate the next locationId
async function generateLocationId() {
  const lastLocation = await Location.findOne().sort({ createdDate: -1 });
  if (!lastLocation || !lastLocation.locationId) {
    return 'LOC001';
  }
  const lastIdNum = parseInt(lastLocation.locationId.replace('LOC', ''), 10);
  const nextIdNum = lastIdNum + 1;
  return `LOC${nextIdNum.toString().padStart(3, '0')}`;
}

// Create a new location (Protected Route)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { locationCode, latitude, longitude, description, isActive, createdBy } = req.body;

    // ✅ Validate createdBy format (ADM###)
    if (!/^ADM\d{3}$/.test(createdBy)) {
      return res.status(400).json({ message: "Invalid adminId format. Expected: ADM###" });
    }

    // ✅ Check if createdBy exists and belongs to an Admin
    const adminExists = await Signup.findOne({ adminId: createdBy, role: "Admin" });
    if (!adminExists) {
      return res.status(400).json({ message: "Invalid adminId: Admin does not exist" });
    }

    // ✅ Generate the next locationId
    const locationId = await generateLocationId();

    // ✅ Create new location
    const newLocation = new Location({
      locationId,
      locationCode,
      latitude,
      longitude,
      description,
      isActive,
      createdBy, // ✅ Store the valid adminId
    });

    const savedLocation = await newLocation.save();

    res.status(201).json({
      message: 'Location added successfully',
      location: savedLocation
    });

  } catch (error) {
    res.status(500).json({ message: 'Error adding location', error: error.message });
  }
});

// ✅ Get all locations (full data)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const locations = await Location.find(); // Fetch all documents

    res.status(200).json({
      success: true,
      locations
    });
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch locations',
      error: error.message
    });
  }
});


router.get('/:locationCode', async (req, res) => {
  try {
    const { locationCode } = req.params;

    // Find the location based on locationCode
    const location = await Location.findOne({ locationCode });

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    res.status(200).json({
      locationCode: location.locationCode,
      latitude: location.latitude,
      longitude: location.longitude
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching location', error: error.message });
  }
});






module.exports = router;
