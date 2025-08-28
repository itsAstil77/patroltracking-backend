const express = require('express');
const router = express.Router();
const Sos = require('../models/sos'); // Adjust path if needed
const Signup = require("../models/signup");
const authMiddleware = require("../middleware/authMiddleware");

// POST /sos - Store SOS alert
router.post('/', authMiddleware,async (req, res) => {
  try {
    const { userId, remarks, coordinates } = req.body;

    // Validation
    if (!userId || !coordinates) {
      return res.status(400).json({ error: "patrolId and coordinates are required." });
    }
    const user = await Signup.findOne({ userId });

      if (!user) {
        return res.status(400).json({ error: "User not found." });
      }

      // Block Admin users
      if (user.role === 'Admin') {
        return res.status(403).json({ error: "Admins are not allowed to perform this action." });
      }

    // Create new SOS entry
    const newSos = new Sos({
      userId,
      remarks,
      coordinates,
      createdDate:new Date() 
    });

    await newSos.save();

    res.status(200).json({ message: 'SOS alert saved successfully.', data: newSos });

  } catch (error) {
    console.error("Error saving SOS:", error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
