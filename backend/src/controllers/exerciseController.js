const Exercise = require('../models/Exercise');
const Workout = require('../models/Workout');
const WeeklyPlan = require('../models/WeeklyPlan');
const { MUSCLE_GROUPS, EQUIPMENT } = require('../models/constants');
const { httpError, escapeRegex } = require('../utils/http');

const EDITABLE_FIELDS = ['name', 'muscleGroup', 'equipment', 'description', 'image'];

async function listExercises(req, res) {
  const { search, muscleGroup, equipment, custom } = req.query;
  const filter = Exercise.visibleTo(req.user.id);

  if (search) filter.name = { $regex: escapeRegex(String(search)), $options: 'i' };
  if (muscleGroup) filter.muscleGroup = String(muscleGroup);
  if (equipment) filter.equipment = String(equipment);
  if (custom === 'true') filter.isCustom = true;
  if (custom === 'false') filter.isCustom = false;

  const exercises = await Exercise.find(filter).sort({ name: 1 });
  res.json(exercises);
}

function getMeta(req, res) {
  res.json({ muscleGroups: MUSCLE_GROUPS, equipment: EQUIPMENT });
}

async function getExercise(req, res) {
  const exercise = await Exercise.findOne({ _id: req.params.id, ...Exercise.visibleTo(req.user.id) });
  if (!exercise) throw httpError(404, 'Exercise not found');
  res.json(exercise);
}

async function createExercise(req, res) {
  const data = {};
  for (const field of EDITABLE_FIELDS) {
    if (req.body?.[field] !== undefined) data[field] = req.body[field];
  }

  const exercise = await Exercise.create({ ...data, isCustom: true, createdBy: req.user.id });
  res.status(201).json(exercise);
}

async function findOwnCustomExercise(req) {
  const exercise = await Exercise.findOne({ _id: req.params.id, isCustom: true, createdBy: req.user.id });
  if (!exercise) throw httpError(404, 'Custom exercise not found');
  return exercise;
}

async function updateExercise(req, res) {
  const exercise = await findOwnCustomExercise(req);
  for (const field of EDITABLE_FIELDS) {
    if (req.body?.[field] !== undefined) exercise[field] = req.body[field];
  }
  await exercise.save();
  res.json(exercise);
}

async function deleteExercise(req, res) {
  const exercise = await findOwnCustomExercise(req);

  const usedIn = await Workout.countDocuments({ user: req.user.id, 'exercises.exercise': exercise._id });
  if (usedIn > 0) {
    throw httpError(409, `Exercise is used in ${usedIn} workout(s). Remove it from those workouts first.`);
  }

  await WeeklyPlan.updateMany({ user: req.user.id }, { $pull: { 'days.$[].exercises': exercise._id } });
  await exercise.deleteOne();
  res.status(204).end();
}

module.exports = { listExercises, getMeta, getExercise, createExercise, updateExercise, deleteExercise };
