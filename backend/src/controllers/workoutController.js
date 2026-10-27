const Workout = require('../models/Workout');
const Exercise = require('../models/Exercise');
const WeeklyPlan = require('../models/WeeklyPlan');
const { httpError, toId } = require('../utils/http');

const POPULATE_EXERCISE = { path: 'exercises.exercise', select: 'name muscleGroup equipment image isCustom' };

function normalizeExercises(exercises) {
  if (!Array.isArray(exercises)) throw httpError(400, 'exercises must be an array');

  return exercises.map((entry) => {
    if (!entry?.exercise) throw httpError(400, 'Each workout exercise needs an exercise id');
    const sets = Array.isArray(entry.sets) ? entry.sets : [];
    return {
      exercise: toId(entry.exercise),
      sets: sets.map((set, i) => ({
        setNumber: set.setNumber ?? i + 1,
        reps: set.reps,
        weight: set.weight ?? 0,
      })),
    };
  });
}

function pickWorkoutFields(body = {}) {
  const data = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.date !== undefined) data.date = body.date;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.exercises !== undefined) data.exercises = normalizeExercises(body.exercises);
  return data;
}

// Makes sure every referenced exercise exists and is visible to this user.
async function assertExercisesVisible(userId, exercises = []) {
  const ids = [...new Set(exercises.map((e) => String(e.exercise)))];
  if (ids.length === 0) return;
  const count = await Exercise.countDocuments({ _id: { $in: ids }, ...Exercise.visibleTo(userId) });
  if (count !== ids.length) throw httpError(400, 'One or more exercises do not exist');
}

async function listWorkouts(req, res) {
  const { from, to, limit } = req.query;
  const filter = { user: req.user.id };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(String(from));
    if (to) filter.date.$lte = new Date(String(to));
  }

  const query = Workout.find(filter).sort({ date: -1, createdAt: -1 }).populate(POPULATE_EXERCISE);
  const max = parseInt(limit, 10);
  if (max > 0) query.limit(Math.min(max, 500));
  res.json(await query);
}

async function getWorkout(req, res) {
  const workout = await Workout.findOne({ _id: req.params.id, user: req.user.id }).populate(POPULATE_EXERCISE);
  if (!workout) throw httpError(404, 'Workout not found');
  res.json(workout);
}

async function createWorkout(req, res) {
  const data = pickWorkoutFields(req.body);
  await assertExercisesVisible(req.user.id, data.exercises);

  const workout = await Workout.create({ ...data, user: req.user.id });
  await workout.populate(POPULATE_EXERCISE);
  res.status(201).json(workout);
}

async function updateWorkout(req, res) {
  const workout = await Workout.findOne({ _id: req.params.id, user: req.user.id });
  if (!workout) throw httpError(404, 'Workout not found');

  const data = pickWorkoutFields(req.body);
  await assertExercisesVisible(req.user.id, data.exercises);

  workout.set(data);
  await workout.save();
  await workout.populate(POPULATE_EXERCISE);
  res.json(workout);
}

async function deleteWorkout(req, res) {
  const workout = await Workout.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!workout) throw httpError(404, 'Workout not found');

  // Unassign the deleted workout from any plan days that referenced it.
  await WeeklyPlan.updateMany(
    { user: req.user.id, 'days.workout': workout._id },
    { $set: { 'days.$[d].workout': null } },
    { arrayFilters: [{ 'd.workout': workout._id }] }
  );
  res.status(204).end();
}

module.exports = { listWorkouts, getWorkout, createWorkout, updateWorkout, deleteWorkout };
