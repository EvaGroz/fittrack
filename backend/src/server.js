require('dotenv').config();

const mongoose = require('mongoose');
const createApp = require('./app');
const { getConfig } = require('./config/env');
const { buildMongoUri, connectDB } = require('./config/db');
const syncExerciseLibrary = require('./seed/seedExercises');

async function start() {
  const config = getConfig();
  if (!config.jwtSecret) {
    console.error('JWT_SECRET is not set. Refusing to start.');
    process.exit(1);
  }

  // Start listening first so /api/health can report the DB status while connecting.
  const server = createApp().listen(config.port, () => {
    console.log(`FitTrack API listening on port ${config.port}`);
  });

  try {
    await connectDB(buildMongoUri(config.mongo));
    await syncExerciseLibrary();
  } catch (err) {
    console.error('Startup failed:', err.message);
    process.exit(1);
  }

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
