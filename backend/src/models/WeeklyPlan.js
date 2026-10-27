const mongoose = require('mongoose');
const { DAYS } = require('./constants');

const planDaySchema = new mongoose.Schema(
  {
    day: { type: String, required: true, enum: DAYS },
    workout: { type: mongoose.Schema.Types.ObjectId, ref: 'Workout', default: null },
    exercises: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' }],
    notes: { type: String, default: '', trim: true, maxlength: 1000 },
    done: { type: Boolean, default: false },
    doneAt: { type: Date, default: null },
  },
  { _id: false }
);

const weeklyPlanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    weekStart: { type: Date, required: true },
    days: { type: [planDaySchema], default: [] },
  },
  { timestamps: true }
);

weeklyPlanSchema.index({ user: 1, weekStart: -1 });

module.exports = mongoose.model('WeeklyPlan', weeklyPlanSchema);
