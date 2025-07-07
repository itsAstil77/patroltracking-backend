const express = require('express');
const router = express.Router();
const Location = require('../models/locationCodeMaster');
const Signup = require("../models/signup"); // ✅ Import Signup model
const generateLocationId = require('../utils/generateLocationId'); 
const authMiddleware = require('../middleware/authMiddleware'); // Import auth middleware


// Create a new location (Protected Route)
router.post('/',authMiddleware, async (req, res) => {
  try {
    const {locationCode, latitude, longitude, description, createdBy } = req.body;

    // ✅ Validate userId format (USR###)
    if (!/^USR\d{3}$/.test(createdBy)) {
      return res.status(400).json({ message: "Invalid userId format. Expected: USR###" });
    }

    // ✅ Check if userId exists and belongs to an Admin
    const adminExists = await Signup.findOne({ userId : createdBy, role: "Admin" });
    if (!adminExists) {
      return res.status(400).json({ message: "Invalid userId: Admin does not exist" });
    }

    const loccode = await Location.findOne({locationCode})
    if(loccode){
      return res.status(400).json({message:"Locationcode already exists"})
    }
    


    // ✅ Generate the next locationId
    const locationId = await generateLocationId();

    // ✅ Create new location
    const newLocation = new Location({
      // locationName,
      locationId,
      locationCode,
      latitude,
      longitude,
      description,
      // isActive,
      createdBy, // ✅ Store the valid adminId
    });

    const savedLocation = await newLocation.save();

    res.status(200).json({
      message: 'Location added successfully',
      location: savedLocation
    });

  } catch (error) {
    res.status(500).json({ message: 'Error adding location', error: error.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    // Extract page and limit from query, set default values
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Calculate total documents
    const totalLocations = await Location.countDocuments();

    // Fetch paginated data
    const locations = await Location.find()
    .sort({createdDate:-1})
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      currentPage: page,
      totalPages: Math.ceil(totalLocations / limit),
      totalLocations,
      locations
    });
  } catch (error) {
    console.error("Error fetching paginated locations:", error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch locations',
      error: error.message
    });
  }
});

router.get('/drop', authMiddleware, async (req, res) => {
  try {
    const locations = await Location.find().sort({ createdDate: -1 }); // optional sort

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




router.get('/:locationCode',authMiddleware, async (req, res) => {
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


// ✅ Update location by locationId
router.put('/:locationId',authMiddleware, async (req, res) => {
  try {
    const { locationId } = req.params;
    const {
      // locationName,
      locationCode,
      latitude,
      longitude,
      description,
      // isActive,
      modifiedBy
    } = req.body;

    // ✅ Validate modifiedBy format (ADM###)
    // ✅ Validate userId format (USR###)
    if (!/^USR\d{3}$/.test(modifiedBy)) {
      return res.status(400).json({ message: "Invalid userId format. Expected: USR###" });
    }

    // ✅ Check if modifying admin exists
    const adminExists = await Signup.findOne({ userId: modifiedBy, role: "Admin" });
    if (!adminExists) {
      return res.status(400).json({ message: "Invalid adminId: Admin does not exist" });
    }

    // ✅ Find the location
    const location = await Location.findOne({ locationId });
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    // ✅ Optionally check if the new locationName or locationCode already exists for another location
 // ✅ Optionally check if the new locationCode already exists for another location
    const existing = await Location.findOne({
      locationCode,
      locationId: { $ne: locationId }
    });

    if (existing) {
      return res.status(400).json({ message: "Location name or code already exists" });
    }

    // ✅ Update fields
    // location.locationName = locationName?.trim() || location.locationName;
    location.locationCode = locationCode?.trim().toUpperCase() || location.locationCode;
    location.latitude = latitude ?? location.latitude;
    location.longitude = longitude ?? location.longitude;
    location.description = description ?? location.description;
    // location.isActive = isActive ?? location.isActive;
    location.modifiedBy = modifiedBy;
    location.modifiedDate = new Date();

    // ✅ Save
    await location.save();

    res.status(200).json({
      message: "Location updated successfully",
      location
    });
  } catch (error) {
    console.error("❌ Error updating location:", error);
    res.status(500).json({ message: "Error updating location", error: error.message });
  }
});

// ✅ Delete location by locationId (Soft Delete or Hard Delete based on your requirement)
router.delete('/:locationId',authMiddleware, async (req, res) => {
  try {
    const { locationId } = req.params;
    const { deletedBy } = req.body;

    // ✅ Validate admin format
    if (!/^USR\d{3}$/.test(deletedBy)) {
      return res.status(400).json({ message: "Invalid userId format. Expected: USR###" });
    }
   // ✅ Check if modifying admin exists
   const adminExists = await Signup.findOne({ userId: deletedBy, role: "Admin" });
   if (!adminExists) {
     return res.status(400).json({ message: "Invalid adminId: Admin does not exist" });
   }

    // ✅ Find location
    const location = await Location.findOne({ locationId });
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    // ❗ Option 1: Hard delete (permanently remove from DB)
    await Location.deleteOne({ locationId });

    // ❗ Option 2: Soft delete (mark as inactive)
    // location.isActive = false;
    // location.modifiedBy = deletedBy;
    // location.modifiedDate = new Date();
    // await location.save();

    res.status(200).json({ message: "Location deleted successfully" });

  } catch (error) {
    console.error("❌ Error deleting location:", error);
    res.status(500).json({ message: "Error deleting location", error: error.message });
  }
});


module.exports = router;
