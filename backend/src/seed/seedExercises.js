const fs = require('fs');
const path = require('path');
const Exercise = require('../models/Exercise');

const DEFAULT_SEED_FILE = path.resolve(__dirname, '../../data/seed-exercises.json');
const SYNCED_FIELDS = ['muscleGroup', 'equipment', 'description', 'image'];
const DUPLICATE_KEY = 11000;

function loadSeedFile() {
  const seedFile = process.env.SEED_FILE ? path.resolve(process.env.SEED_FILE) : DEFAULT_SEED_FILE;
  return { seedFile, exercises: JSON.parse(fs.readFileSync(seedFile, 'utf8')) };
}

// Upserts the built-in exercise library by name on every startup: inserts missing exercises and
// updates changed fields. Custom exercises are never touched and library exercises missing from
// the file are kept (workouts may reference them). Returns { inserted, updated, unchanged }.
async function syncExerciseLibrary() {
  // Make sure the unique library-name index exists (and drop indexes no longer in the schema)
  // before upserting, so concurrent startups cannot insert duplicates.
  await Exercise.syncIndexes();

  const { seedFile, exercises } = loadSeedFile();
  const now = new Date();
  const operations = exercises.map((exercise) => {
    const fields = {};
    for (const field of SYNCED_FIELDS) fields[field] = exercise[field] ?? '';
    return {
      updateOne: {
        filter: { name: exercise.name, isCustom: false },
        update: {
          $set: fields,
          $setOnInsert: { isCustom: false, createdBy: null, createdAt: now, updatedAt: now },
        },
        upsert: true,
        runValidators: true,
        // Automatic timestamps would modify every document on every startup.
        timestamps: false,
      },
    };
  });

  let result;
  try {
    result = await Exercise.bulkWrite(operations, { ordered: false });
  } catch (err) {
    // Another instance inserted the same exercise concurrently; everything else was applied.
    const onlyDuplicates = err.writeErrors?.length && err.writeErrors.every((e) => e.code === DUPLICATE_KEY);
    if (!onlyDuplicates) throw err;
    result = err.result;
  }

  const inserted = result.upsertedCount;
  const updated = result.modifiedCount;
  const summary = { inserted, updated, unchanged: exercises.length - inserted - updated };
  console.log(
    `Exercise library synced from ${seedFile}: ${summary.inserted} inserted, ${summary.updated} updated, ${summary.unchanged} unchanged`
  );
  return summary;
}

module.exports = syncExerciseLibrary;
