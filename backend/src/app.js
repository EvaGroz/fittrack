const express = require('express');
const cors = require('cors');
const { getConfig } = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Builds the Express app without starting a server, so tests can use it with supertest.
function createApp() {
  const { corsOrigin } = getConfig();
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: corsOrigin.length ? corsOrigin : false }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/health', require('./routes/health'));
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/exercises', require('./routes/exercises'));
  app.use('/api/workouts', require('./routes/workouts'));
  app.use('/api/plans', require('./routes/plans'));
  app.use('/api/stats', require('./routes/stats'));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
