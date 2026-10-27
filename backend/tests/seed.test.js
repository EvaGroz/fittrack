const fs = require('fs');
const path = require('path');
const Exercise = require('../src/models/Exercise');
const syncExerciseLibrary = require('../src/seed/seedExercises');

const seed = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/seed-exercises.json'), 'utf8'));

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('seed file', () => {
  it('has unique names and an image path for every exercise', () => {
    const names = seed.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
    for (const exercise of seed) {
      expect(exercise.image).toMatch(/^\/exercises\/[a-z0-9-]+\.jpg$/);
    }
  });
});

describe('syncExerciseLibrary', () => {
  it('inserts all library exercises into an empty database', async () => {
    const result = await syncExerciseLibrary();

    expect(result).toEqual({ inserted: seed.length, updated: 0, unchanged: 0 });
    const exercises = await Exercise.find({ isCustom: false });
    expect(exercises).toHaveLength(seed.length);
    expect(exercises.every((e) => e.image.startsWith('/exercises/'))).toBe(true);
    expect(exercises.every((e) => e.createdAt instanceof Date)).toBe(true);
  });

  it('is idempotent and never creates duplicates', async () => {
    await syncExerciseLibrary();
    const second = await syncExerciseLibrary();

    expect(second).toEqual({ inserted: 0, updated: 0, unchanged: seed.length });
    expect(await Exercise.countDocuments()).toBe(seed.length);
  });

  it('updates existing library exercises in place (keeps their ids)', async () => {
    const [first] = seed;
    const old = await Exercise.create({
      name: first.name,
      muscleGroup: first.muscleGroup,
      equipment: first.equipment,
      description: 'old description',
    });

    const result = await syncExerciseLibrary();

    expect(result.updated).toBe(1);
    expect(result.inserted).toBe(seed.length - 1);
    const updated = await Exercise.findById(old._id);
    expect(updated.image).toBe(first.image);
    expect(updated.description).toBe(first.description);
    expect(await Exercise.countDocuments({ name: first.name })).toBe(1);
  });

  it('never touches custom exercises, even with the same name', async () => {
    const userId = '64b000000000000000000001';
    const custom = await Exercise.create({
      name: seed[0].name,
      muscleGroup: 'core',
      equipment: 'band',
      description: 'my own version',
      image: 'https://example.com/mine.jpg',
      isCustom: true,
      createdBy: userId,
    });

    await syncExerciseLibrary();
    await syncExerciseLibrary();

    const after = await Exercise.findById(custom._id).lean();
    expect(after).toMatchObject({
      isCustom: true,
      description: 'my own version',
      image: 'https://example.com/mine.jpg',
      equipment: 'band',
    });
    expect(await Exercise.countDocuments({ name: seed[0].name, isCustom: false })).toBe(1);
    expect(await Exercise.countDocuments()).toBe(seed.length + 1);
  });
});
