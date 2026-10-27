const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const READY_STATES = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

router.get('/', async (req, res) => {
  const state = mongoose.connection.readyState;
  let db = READY_STATES[state] || 'unknown';

  if (state === 1) {
    try {
      await mongoose.connection.db.command({ ping: 1 });
    } catch {
      db = 'error';
    }
  }

  const healthy = db === 'connected';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'error',
    db,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
