const request = require('supertest');
const mongoose = require('mongoose');
const createApp = require('../src/app');

const app = createApp();

describe('GET /api/health', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns 200 and reports the database as connected', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'connected' });
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.timestamp).toBeDefined();
  });

  it('returns 503 when the database does not respond', async () => {
    jest.spyOn(mongoose.connection.db, 'command').mockRejectedValueOnce(new Error('ping failed'));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'error', db: 'error' });
  });

  it('does not require authentication', async () => {
    const res = await request(app).get('/api/health').set('Authorization', 'Bearer not-a-token');
    expect(res.status).toBe(200);
  });
});

describe('unknown routes', () => {
  it('return 404 JSON', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
});
