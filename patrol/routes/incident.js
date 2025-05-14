const express = require('express');
const router = express.Router();
const Incident = require('../models/incident'); // Model for reported incidents
const IncidentMaster = require('../models/incidentmaster'); // Model for master data

// POST - Store selected incidents for a patrol using incident codes
router.post('/', async (req, res) => {
  try {
    const { patrolId, incidentCodes } = req.body;

    // Validate request body
    if (!patrolId || !Array.isArray(incidentCodes) || incidentCodes.length === 0) {
      return res.status(400).json({ message: 'Patrol ID and an array of incident codes are required' });
    }

    // Retrieve incident templates matching the provided codes
    const incidentTemplates = await IncidentMaster.find({ code: { $in: incidentCodes } });

    // Check for any missing incident codes
    const foundCodes = incidentTemplates.map(template => template.code);
    const missingCodes = incidentCodes.filter(code => !foundCodes.includes(code));

    if (missingCodes.length > 0) {
      return res.status(404).json({ message: 'Some incident codes not found in master records', missingCodes });
    }

    // Prepare incident documents for insertion
    const newIncidents = incidentTemplates.map(template => ({
      incidentName: template.incident,
      severity: template.severity,
      type: 'incident',
      patrolId: patrolId,
      date: new Date(),
      isActive: true
    }));

    // Insert multiple incident documents
    const savedIncidents = await Incident.insertMany(newIncidents);

    // Prepare response excluding patrolId
    const response = savedIncidents.map(({ _id, incidentName, severity, type, date, isActive }) => ({
      _id,
      incidentName,
      severity,
      type,
      date,
      isActive
    }));

    res.status(200).json({ message: 'Incidents stored successfully', incidents: response });
  } catch (err) {
    res.status(500).json({ message: 'Error storing incidents', error: err.message });
  }
});

module.exports = router;
