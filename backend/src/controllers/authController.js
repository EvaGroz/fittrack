const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getConfig } = require('../config/env');
const { httpError } = require('../utils/http');

const TOKEN_EXPIRES_IN = '7d';

function signToken(user) {
  return jwt.sign({ id: user._id.toString() }, getConfig().jwtSecret, { expiresIn: TOKEN_EXPIRES_IN });
}

async function register(req, res) {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    throw httpError(400, 'Name, email and password are required');
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  if (await User.exists({ email: normalizedEmail })) {
    throw httpError(409, 'Email is already registered');
  }

  const user = await User.create({ name: String(name), email: normalizedEmail, password: String(password) });
  res.status(201).json({ token: signToken(user), user });
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    throw httpError(400, 'Email and password are required');
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await user.comparePassword(String(password)))) {
    throw httpError(401, 'Invalid email or password');
  }

  res.json({ token: signToken(user), user });
}

async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) throw httpError(401, 'User no longer exists');
  res.json({ user });
}

module.exports = { register, login, me };
