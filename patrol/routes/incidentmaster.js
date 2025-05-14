// routes/incident.js
const express = require('express');
const router = express.Router();
const Incident = require('../models/incidentmaster');

// CREATE Incident
router.post('/', async (req, res) => {
  try {
    const { incident, code, severity } = req.body;

    const newIncident = new Incident({ incident, code, severity });
    await newIncident.save();
    res.status(201).json({ message: 'Incident created', incident: newIncident });
  } catch (err) {
    res.status(500).json({ message: 'Error creating incident', error: err.message });
  }
});

// GET All Incidents
router.get('/', async (req, res) => {
  try {
    const incidents = await Incident.find();
    res.status(200).json(incidents);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching incidents', error: err.message });
  }
});

// GET Incident by ID
router.get('/:id', async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    res.status(200).json(incident);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching incident', error: err.message });
  }
});

// UPDATE Incident
router.put('/:id', async (req, res) => {
  try {
    const updatedIncident = await Incident.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ message: 'Incident updated', incident: updatedIncident });
  } catch (err) {
    res.status(500).json({ message: 'Error updating incident', error: err.message });
  }
});

// DELETE Incident
router.delete('/:id', async (req, res) => {
  try {
    await Incident.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Incident deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting incident', error: err.message });
  }
});

module.exports = router;
