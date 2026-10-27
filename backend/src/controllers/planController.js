const WeeklyPlan = require('../models/WeeklyPlan');
const Workout = require('../models/Workout');
const Exercise = require('../models/Exercise');
const { DAYS } = require('../models/constants');
const { httpError, mondayOf, toId } = require('../utils/http');

const POPULATE_DAYS = [
  { path: 'days.workout', select: 'name date' },
  { path: 'days.exercises', select: 'name muscleGroup equipment' },
];

function parseWeekStart(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) throw httpError(400, 'weekStart is not a valid date');
  return mondayOf(date);
}

function normalizeDay(input = {}, existing = {}) {
  const day = { ...existing };
  if (input.workout !== undefined) day.workout = input.workout ? toId(input.workout) : null;
  if (input.exercises !== undefined) {
    if (!Array.isArray(input.exercises)) throw httpError(400, 'exercises must be an array');
    day.exercises = input.exercises.map(toId);
  }
  if (input.notes !== undefined) day.notes = input.notes;
  if (input.done !== undefined) {
    const done = Boolean(input.done);
    if (done !== Boolean(existing.done)) day.doneAt = done ? new Date() : null;
    day.done = done;
  }
  return day;
}

// Always returns all 7 days in Mon..Sun order, merging the provided days into the existing ones.
function normalizeDays(inputDays, existingDays = []) {
  if (inputDays === undefined) inputDays = [];
  if (!Array.isArray(inputDays)) throw httpError(400, 'days must be an array');

  for (const d of inputDays) {
    if (!DAYS.includes(d?.day)) throw httpError(400, `Invalid day: ${d?.day}. Use one of ${DAYS.join(', ')}`);
  }

  return DAYS.map((day) => {
    const existing = existingDays.find((d) => d.day === day);
    const base = existing ? existing.toObject?.() ?? existing : { day, workout: null, exercises: [], notes: '', done: false, doneAt: null };
    const input = inputDays.find((d) => d.day === day);
    return input ? normalizeDay(input, base) : base;
  });
}

async function assertRefsValid(userId, days) {
  const workoutIds = [...new Set(days.filter((d) => d.workout).map((d) => String(d.workout)))];
  const exerciseIds = [...new Set(days.flatMap((d) => d.exercises || []).map(String))];

  if (workoutIds.length) {
    const count = await Workout.countDocuments({ _id: { $in: workoutIds }, user: userId });
    if (count !== workoutIds.length) throw httpError(400, 'One or more workouts do not exist');
  }
  if (exerciseIds.length) {
    const count = await Exercise.countDocuments({ _id: { $in: exerciseIds }, ...Exercise.visibleTo(userId) });
    if (count !== exerciseIds.length) throw httpError(400, 'One or more exercises do not exist');
  }
}

async function findOwnPlan(req) {
  const plan = await WeeklyPlan.findOne({ _id: req.params.id, user: req.user.id });
  if (!plan) throw httpError(404, 'Plan not found');
  return plan;
}

async function listPlans(req, res) {
  const plans = await WeeklyPlan.find({ user: req.user.id }).sort({ weekStart: -1, createdAt: -1 }).populate(POPULATE_DAYS);
  res.json(plans);
}

async function getPlan(req, res) {
  const plan = await findOwnPlan(req);
  await plan.populate(POPULATE_DAYS);
  res.json(plan);
}

async function createPlan(req, res) {
  const { name, weekStart, days } = req.body || {};
  const normalizedDays = normalizeDays(days);
  await assertRefsValid(req.user.id, normalizedDays);

  const plan = await WeeklyPlan.create({
    user: req.user.id,
    name,
    weekStart: parseWeekStart(weekStart),
    days: normalizedDays,
  });
  await plan.populate(POPULATE_DAYS);
  res.status(201).json(plan);
}

async function updatePlan(req, res) {
  const plan = await findOwnPlan(req);
  const { name, weekStart, days } = req.body || {};

  if (name !== undefined) plan.name = name;
  if (weekStart !== undefined) plan.weekStart = parseWeekStart(weekStart);
  if (days !== undefined) {
    const normalizedDays = normalizeDays(days, plan.days);
    await assertRefsValid(req.user.id, normalizedDays);
    plan.days = normalizedDays;
  }

  await plan.save();
  await plan.populate(POPULATE_DAYS);
  res.json(plan);
}

async function updatePlanDay(req, res) {
  const { day } = req.params;
  if (!DAYS.includes(day)) throw httpError(400, `Invalid day: ${day}. Use one of ${DAYS.join(', ')}`);

  const plan = await findOwnPlan(req);
  const normalizedDays = normalizeDays([{ ...req.body, day }], plan.days);
  await assertRefsValid(req.user.id, normalizedDays);

  plan.days = normalizedDays;
  await plan.save();
  await plan.populate(POPULATE_DAYS);
  res.json(plan);
}

async function deletePlan(req, res) {
  const plan = await findOwnPlan(req);
  await plan.deleteOne();
  res.status(204).end();
}

module.exports = { listPlans, getPlan, createPlan, updatePlan, updatePlanDay, deletePlan };
