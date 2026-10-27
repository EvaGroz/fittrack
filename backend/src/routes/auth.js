const express = require('express');
const requireAuth = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');
const { register, login, me } = require('../controllers/authController');

const router = express.Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', requireAuth, asyncHandler(me));

module.exports = router;
