const express = require('express');
const requireAuth = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');
const c = require('../controllers/workoutController');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(c.listWorkouts));
router.post('/', asyncHandler(c.createWorkout));
router.get('/:id', asyncHandler(c.getWorkout));
router.put('/:id', asyncHandler(c.updateWorkout));
router.delete('/:id', asyncHandler(c.deleteWorkout));

module.exports = router;
