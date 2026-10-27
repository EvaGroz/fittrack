// Runs before every test file: starts an in-memory MongoDB so tests never touch a real database.
const os = require('os');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test-jwt-secret';
process.env.CORS_ORIGIN = 'http://localhost:5173';

let mongoServer;

beforeAll(async () => {
  // The first run downloads a MongoDB binary, which can take a while.
  mongoServer = await MongoMemoryServer.create();
  // The MongoDB driver loads `os` with a dynamic import(), which Jest's CommonJS sandbox does not
  // support. Without it the driver sends empty client metadata and the server rejects the handshake,
  // so the module is passed in directly.
  await mongoose.connect(mongoServer.getUri(), { runtimeAdapters: { os } });
}, 120000);

afterEach(async () => {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});
