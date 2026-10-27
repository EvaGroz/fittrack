const request = require('supertest');
const jwt = require('jsonwebtoken');
const createApp = require('../src/app');
const User = require('../src/models/User');

const app = createApp();

const validUser = { name: 'Test User', email: 'test@example.com', password: 'secret123' };

const register = (body = validUser) => request(app).post('/api/auth/register').send(body);
const login = (body) => request(app).post('/api/auth/login').send(body);

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token without the password', async () => {
    const res = await register();

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: 'Test User', email: 'test@example.com' });
    expect(res.body.user.password).toBeUndefined();

    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(payload.id).toBe(res.body.user._id);
  });

  it('stores the password as a bcrypt hash', async () => {
    await register();
    const user = await User.findOne({ email: validUser.email }).select('+password');

    expect(user.password).not.toBe(validUser.password);
    expect(user.password).toMatch(/^\$2[aby]\$/);
    expect(await user.comparePassword(validUser.password)).toBe(true);
  });

  it('rejects a duplicate email regardless of case', async () => {
    await register();
    const res = await register({ ...validUser, email: 'TEST@Example.com' });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already registered/i);
  });

  it.each([
    ['missing name', { email: 'a@b.com', password: 'secret123' }],
    ['missing email', { name: 'A', password: 'secret123' }],
    ['missing password', { name: 'A', email: 'a@b.com' }],
    ['short password', { name: 'A', email: 'a@b.com', password: '123' }],
    ['invalid email', { name: 'A', email: 'not-an-email', password: 'secret123' }],
  ])('returns 400 for %s', async (_label, body) => {
    const res = await register(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toEqual(expect.any(String));
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await register();
  });

  it('returns a token for valid credentials', async () => {
    const res = await login({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user.password).toBeUndefined();
  });

  it('returns 401 for a wrong password', async () => {
    const res = await login({ email: validUser.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  it('returns 401 for an unknown email', async () => {
    const res = await login({ email: 'nobody@example.com', password: 'secret123' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when fields are missing', async () => {
    const res = await login({ email: validUser.email });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me and protected routes', () => {
  it('returns the current user for a valid token', async () => {
    const { body } = await register();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validUser.email);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid.token.value');
    expect(res.status).toBe(401);
  });

  it('returns 401 for a token signed with another secret', async () => {
    const forged = jwt.sign({ id: '000000000000000000000000' }, 'some-other-secret');
    const res = await request(app).get('/api/workouts').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('protects resource routes', async () => {
    const res = await request(app).get('/api/workouts');
    expect(res.status).toBe(401);
  });
});
