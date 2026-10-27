const mongoose = require('mongoose');
const { MUSCLE_GROUPS, EQUIPMENT } = require('./constants');

// "/exercises/x.jpg" (not "//host/...") or an absolute http(s) URL.
const IMAGE_PATTERN = /^(\/(?!\/)\S*|https?:\/\/\S+)$/i;

const exerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    muscleGroup: {
      type: String,
      required: [true, 'Muscle group is required'],
      enum: { values: MUSCLE_GROUPS, message: 'Invalid muscle group: {VALUE}' },
    },
    equipment: {
      type: String,
      required: [true, 'Equipment is required'],
      enum: { values: EQUIPMENT, message: 'Invalid equipment: {VALUE}' },
    },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    // Root-relative path served by the frontend (library) or an http(s) URL (custom exercises).
    image: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Image URL is too long'],
      validate: {
        validator: (value) => value === '' || IMAGE_PATTERN.test(value),
        message: 'Image must be an http(s) URL or a path starting with /',
      },
    },
    isCustom: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Library exercise names are unique so the startup sync can never create duplicates,
// even when several backend instances start at once. Custom exercises may reuse any name.
exerciseSchema.index(
  { name: 1 },
  { name: 'library_name_unique', unique: true, partialFilterExpression: { isCustom: false } }
);
exerciseSchema.index({ createdBy: 1 });

// Filter for exercises a user may see: the shared library plus their own custom ones.
exerciseSchema.statics.visibleTo = function visibleTo(userId) {
  return { $or: [{ isCustom: false }, { createdBy: userId }] };
};

module.exports = mongoose.model('Exercise', exerciseSchema);
