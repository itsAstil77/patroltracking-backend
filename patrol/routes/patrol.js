const express = require('express');
const router = express.Router();
const Signup = require('../models/signup');      // Patrol model
const Checklist = require('../models/checklist'); // Checklist model
const Multimedia = require('../models/media'); // Multimedia model


// GET only patrolGuardName and patrolId for all Patrols
router.get('/', async (req, res) => {
    try {
      const patrols = await Signup.find(
        { role: 'Patrol' }, // Filter only Patrols
        'patrolGuardName patrolId' // Project only needed fields
      );
      res.status(200).json(patrols);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching patrols', error: err.message });
    }
  });

  // GET details of a specific patrol by patrolId

  
  router.get('/:id', async (req, res) => {
    try {
      const patrolId = req.params.id;
  
      // 1. Get patrol info from Signup
      const patrol = await Signup.findOne({ patrolId });
      if (!patrol) {
        return res.status(404).json({ message: 'Patrol not found' });
      }
  
      // 2. Get checklist info where assignedTo = patrolId
      const checklists = await Checklist.find({ assignedTo: patrolId }).select('checklistId');
  
      // 3. Get media associated with the patrol
      const multimedia = await Multimedia.find({ patrolId }).select('mediaType mediaUrl');
  
      // 4. Build the response
      const response = {
        patrolName: patrol.patrolGuardName,
        date: patrol.createdDate,
        checklists,
        multimedia
      };
  
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching patrol details', error: error.message });
    }
  });
  
  

module.exports = router;