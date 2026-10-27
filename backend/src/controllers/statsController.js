const mongoose = require('mongoose');
const Workout = require('../models/Workout');
const Exercise = require('../models/Exercise');
const { httpError, mondayOf } = require('../utils/http');

const DAY_MS = 24 * 60 * 60 * 1000;
const SET_VOLUME = { $multiply: ['$exercises.sets.reps', '$exercises.sets.weight'] };

// Volume (reps x weight summed over all sets) of a whole workout document, computed in place.
const WORKOUT_VOLUME = {
  $sum: {
    $map: {
      input: '$exercises',
      as: 'e',
      in: { $sum: { $map: { input: '$$e.sets', as: 's', in: { $multiply: ['$$s.reps', '$$s.weight'] } } } },
    },
  },
};

const userObjectId = (req) => new mongoose.Types.ObjectId(req.user.id);

// ISO-8601 week number and week-year, matching MongoDB's $isoWeek / $isoWeekYear (UTC).
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { year: d.getUTCFullYear(), week: Math.ceil(((d - yearStart) / DAY_MS + 1) / 7) };
}

async function getSummary(req, res) {
  const user = userObjectId(req);
  const weekStart = mondayOf(new Date());

  const [result] = await Workout.aggregate([
    { $match: { user } },
    {
      $facet: {
        workouts: [{ $count: 'count' }],
        thisWeek: [{ $match: { date: { $gte: weekStart, $lt: new Date(weekStart.getTime() + 7 * DAY_MS) } } }, { $count: 'count' }],
        sets: [
          { $unwind: '$exercises' },
          { $unwind: '$exercises.sets' },
          { $group: { _id: null, totalSets: { $sum: 1 }, totalVolume: { $sum: SET_VOLUME } } },
        ],
        lastWorkout: [{ $sort: { date: -1 } }, { $limit: 1 }, { $project: { name: 1, date: 1 } }],
      },
    },
  ]);

  res.json({
    totalWorkouts: result.workouts[0]?.count || 0,
    workoutsThisWeek: result.thisWeek[0]?.count || 0,
    totalSets: result.sets[0]?.totalSets || 0,
    totalVolume: result.sets[0]?.totalVolume || 0,
    lastWorkout: result.lastWorkout[0] || null,
  });
}

async function getExerciseStats(req, res) {
  const { exerciseId } = req.params;
  if (!mongoose.isValidObjectId(exerciseId)) throw httpError(400, 'Invalid exercise id');

  const exercise = await Exercise.findOne({ _id: exerciseId, ...Exercise.visibleTo(req.user.id) });
  if (!exercise) throw httpError(404, 'Exercise not found');

  const exId = new mongoose.Types.ObjectId(exerciseId);
  const [result] = await Workout.aggregate([
    { $match: { user: userObjectId(req), 'exercises.exercise': exId } },
    { $unwind: '$exercises' },
    { $match: { 'exercises.exercise': exId } },
    { $unwind: '$exercises.sets' },
    {
      $facet: {
        progress: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              maxWeight: { $max: '$exercises.sets.weight' },
              volume: { $sum: SET_VOLUME },
              totalReps: { $sum: '$exercises.sets.reps' },
              sets: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: '$_id', maxWeight: 1, volume: 1, totalReps: 1, sets: 1 } },
        ],
        totals: [
          {
            $group: {
              _id: null,
              totalVolume: { $sum: SET_VOLUME },
              totalSets: { $sum: 1 },
              totalReps: { $sum: '$exercises.sets.reps' },
              sessions: { $addToSet: '$_id' },
            },
          },
          { $project: { _id: 0, totalVolume: 1, totalSets: 1, totalReps: 1, sessions: { $size: '$sessions' } } },
        ],
        bestSet: [
          { $sort: { 'exercises.sets.weight': -1, 'exercises.sets.reps': -1, date: 1 } },
          { $limit: 1 },
          { $project: { _id: 0, workoutId: '$_id', date: 1, weight: '$exercises.sets.weight', reps: '$exercises.sets.reps' } },
        ],
      },
    },
  ]);

  res.json({
    exercise,
    progress: result.progress,
    totalVolume: result.totals[0]?.totalVolume || 0,
    totalSets: result.totals[0]?.totalSets || 0,
    totalReps: result.totals[0]?.totalReps || 0,
    sessions: result.totals[0]?.sessions || 0,
    bestSet: result.bestSet[0] || null,
  });
}

async function getWeeklyStats(req, res) {
  const weeks = Math.min(Math.max(parseInt(req.query.weeks, 10) || 12, 1), 104);
  const currentMonday = mondayOf(new Date());
  const since = new Date(currentMonday.getTime() - (weeks - 1) * 7 * DAY_MS);

  const rows = await Workout.aggregate([
    { $match: { user: userObjectId(req), date: { $gte: since } } },
    {
      $group: {
        _id: { year: { $isoWeekYear: '$date' }, week: { $isoWeek: '$date' } },
        workouts: { $sum: 1 },
        volume: { $sum: WORKOUT_VOLUME },
      },
    },
  ]);

  // Fill in weeks without workouts so charts get a continuous series.
  const byKey = new Map(rows.map((r) => [`${r._id.year}-${r._id.week}`, r]));
  const series = [];
  for (let i = 0; i < weeks; i++) {
    const start = new Date(since.getTime() + i * 7 * DAY_MS);
    const { year, week } = isoWeek(start);
    const row = byKey.get(`${year}-${week}`);
    series.push({
      weekStart: start.toISOString().slice(0, 10),
      year,
      week,
      label: `${year}-W${String(week).padStart(2, '0')}`,
      workouts: row?.workouts || 0,
      volume: row?.volume || 0,
    });
  }

  res.json(series);
}

async function getPersonalRecords(req, res) {
  const records = await Workout.aggregate([
    { $match: { user: userObjectId(req) } },
    { $unwind: '$exercises' },
    { $unwind: '$exercises.sets' },
    { $sort: { 'exercises.sets.weight': -1, 'exercises.sets.reps': -1, date: 1 } },
    {
      $group: {
        _id: '$exercises.exercise',
        maxWeight: { $first: '$exercises.sets.weight' },
        repsAtMax: { $first: '$exercises.sets.reps' },
        date: { $first: '$date' },
        workoutId: { $first: '$_id' },
        maxReps: { $max: '$exercises.sets.reps' },
        bestSetVolume: { $max: SET_VOLUME },
        totalVolume: { $sum: SET_VOLUME },
      },
    },
    { $lookup: { from: 'exercises', localField: '_id', foreignField: '_id', as: 'exercise' } },
    { $unwind: '$exercise' },
    {
      $project: {
        _id: 0,
        exerciseId: '$_id',
        name: '$exercise.name',
        muscleGroup: '$exercise.muscleGroup',
        equipment: '$exercise.equipment',
        maxWeight: 1,
        repsAtMax: 1,
        date: 1,
        workoutId: 1,
        maxReps: 1,
        bestSetVolume: 1,
        totalVolume: 1,
      },
    },
    { $sort: { name: 1 } },
  ]);

  res.json(records);
}

module.exports = { getSummary, getExerciseStats, getWeeklyStats, getPersonalRecords };
