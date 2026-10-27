const mongoose = require('mongoose');

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000;

function buildMongoUri({ host, port, db, user, password }) {
  if (user && password) {
    const credentials = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;
    return `mongodb://${credentials}@${host}:${port}/${db}?authSource=admin`;
  }
  return `mongodb://${host}:${port}/${db}`;
}

// Strips credentials so the URI can be logged safely.
function redactUri(uri) {
  return uri.replace(/\/\/([^@]+)@/, '//***:***@');
}

async function connectDB(uri) {
  mongoose.set('strictQuery', true);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`MongoDB connected: ${redactUri(uri)}`);
      return mongoose.connection;
    } catch (err) {
      console.error(`MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
      if (attempt === MAX_RETRIES) throw err;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

module.exports = { buildMongoUri, connectDB, redactUri };
