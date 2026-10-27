const mongoose = require('mongoose');

const setSchema = new mongoose.Schema(
  {
    setNumber: { type: Number, required: true, min: 1 },
    reps: { type: Number, required: [true, 'Reps are required'], min: [0, 'Reps cannot be negative'] },
    weight: { type: Number, default: 0, min: [0, 'Weight cannot be negative'] },
  },
  { _id: false }
);

const workoutExerciseSchema = new mongoose.Schema({
  exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
  sets: { type: [setSchema], default: [] },
});

const workoutSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String, default: '', trim: true, maxlength: 2000 },
    exercises: { type: [workoutExerciseSchema], default: [] },
  },
  { timestamps: true }
);

workoutSchema.index({ user: 1, date: -1 });
workoutSchema.index({ user: 1, 'exercises.exercise': 1 });

module.exports = mongoose.model('Workout', workoutSchema);
