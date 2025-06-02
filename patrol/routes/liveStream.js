const express = require('express');
const router = express.Router();
const LiveStream = require('../models/liveStream');
const authMiddleware = require('../middleware/authMiddleware'); // your JWT middleware
// const generateStreamId = require('../utils/generateStreamId');


// Generate Stream ID inside this file
async function generateStreamId() {
  const latestStream = await LiveStream.findOne().sort({ startedAt: -1 }).exec();
  let count = 1;

  if (latestStream && latestStream.streamId) {
    const match = latestStream.streamId.match(/LIV(\d+)/);
    if (match) count = parseInt(match[1]) + 1;
  }

  return `LIV${String(count).padStart(3, '0')}`;
}
// START a new live stream
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const { location } = req.body;
    const user = req.user;

    if (user.role === 'Admin') {
      return res.status(403).json({ success: false, message: 'Admins are not allowed to start live stream' });
    }

    const streamId = await generateStreamId();

    const newStream = new LiveStream({
      streamId,
      startedBy: user.userId,
      role: user.role,
      location,
    });

    await newStream.save();

    res.status(201).json({
      success: true,
      message: 'Live stream started',
      stream: newStream
    });
  } catch (error) {
    console.error('Start Live Error:', error);
    res.status(500).json({ success: false, message: 'Failed to start live stream', error: error.message });
  }
});

// STOP a live stream
router.put('/stop/:streamId', authMiddleware, async (req, res) => {
  try {
    const { streamId } = req.params;

    const stream = await LiveStream.findOne({ streamId, isLive: true });
    if (!stream) return res.status(404).json({ success: false, message: 'Stream not found or already stopped' });

    stream.isLive = false;
    stream.endTime = new Date();

    await stream.save();

    res.status(200).json({ success: true, message: 'Live stream stopped', stream });
  } catch (error) {
    console.error('Stop Live Error:', error);
    res.status(500).json({ success: false, message: 'Failed to stop live stream', error: error.message });
  }
});

// GET all active streams (only for Patrol/Marshall)
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const user = req.user;

    if (user.role === 'Admin') {
      return res.status(403).json({ success: false, message: 'Admins are not allowed to view live streams' });
    }

    const streams = await LiveStream.find({ isLive: true });

    res.status(200).json({
      success: true,
      count: streams.length,
      streams
    });
  } catch (error) {
    console.error('Fetch Live Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch live streams', error: error.message });
  }
});

module.exports = router;
