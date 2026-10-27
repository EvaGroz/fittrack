const express = require('express');
const requireAuth = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');
const c = require('../controllers/statsController');

const router = express.Router();
router.use(requireAuth);

router.get('/summary', asyncHandler(c.getSummary));
router.get('/weekly', asyncHandler(c.getWeeklyStats));
router.get('/records', asyncHandler(c.getPersonalRecords));
router.get('/exercise/:exerciseId', asyncHandler(c.getExerciseStats));

module.exports = router;
