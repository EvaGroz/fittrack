const express = require('express');
const requireAuth = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');
const c = require('../controllers/planController');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(c.listPlans));
router.post('/', asyncHandler(c.createPlan));
router.get('/:id', asyncHandler(c.getPlan));
router.put('/:id', asyncHandler(c.updatePlan));
router.delete('/:id', asyncHandler(c.deletePlan));
router.patch('/:id/days/:day', asyncHandler(c.updatePlanDay));

module.exports = router;
