// All configuration comes from environment variables. Read lazily so tests can set them first.
function getConfig() {
  const corsOrigin = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    port: parseInt(process.env.PORT, 10) || 5000,
    mongo: {
      host: process.env.MONGO_HOST || 'localhost',
      port: process.env.MONGO_PORT || '27017',
      db: process.env.MONGO_DB || 'fittrack',
      user: process.env.MONGO_USER || '',
      password: process.env.MONGO_PASSWORD || '',
    },
    jwtSecret: process.env.JWT_SECRET || '',
    corsOrigin,
  };
}

module.exports = { getConfig };
