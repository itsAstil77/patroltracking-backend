const express = require("express");
const router = express.Router();
const Checklist = require("../models/checklist");
const Map = require("../models/map"); // ✅ You’re using this

// POST /api/map/:checklistId
router.post("/:checklistId", async (req, res) => {
  try {
    const { checklistId } = req.params;
    const { latitude, longitude } = req.body;

    // Validate input
    if (latitude == null || longitude == null) {
      return res.status(400).json({ message: "Latitude and Longitude are required." });
    }

    // ✅ 1. Update Checklist
    const checklist = await Checklist.findOne({ checklistId });
    if (!checklist) {
      return res.status(404).json({ message: "Checklist not found." });
    }

    checklist.geoCoordinates = { latitude, longitude };
    await checklist.save();

    // ✅ 2. Update or Insert Map
    const updatedMap = await Map.findOneAndUpdate(
      { checklistId },
      { geoCoordinates: { latitude, longitude } },
      { upsert: true, new: true } // Insert if not exists, return updated
    );

    res.status(200).json({
      message: "Coordinates saved to Checklist and Map collections.",
      checklist: {
        checklistId: checklist.checklistId,
        geoCoordinates: checklist.geoCoordinates,
      },
      map: updatedMap
    });
  } catch (error) {
    console.error("Error saving coordinates:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
