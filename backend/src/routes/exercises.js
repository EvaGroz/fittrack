const express = require('express');
const requireAuth = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');
const c = require('../controllers/exerciseController');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(c.listExercises));
router.get('/meta', c.getMeta);
router.post('/', asyncHandler(c.createExercise));
router.get('/:id', asyncHandler(c.getExercise));
router.put('/:id', asyncHandler(c.updateExercise));
router.delete('/:id', asyncHandler(c.deleteExercise));

module.exports = router;
