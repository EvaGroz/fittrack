// Workout and plan dates are stored as UTC midnight, so they are always formatted in UTC.
export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_LABELS = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatDate(value, options = {}) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

export function formatNumber(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value || 0);
}

// "YYYY-MM-DD" of a stored (UTC) date, for <input type="date">.
export function toDateInput(value) {
  return new Date(value).toISOString().slice(0, 10);
}

// "YYYY-MM-DD" of today in the user's local time zone.
export function todayInput() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Monday ("YYYY-MM-DD") of the week that contains the given "YYYY-MM-DD" date.
export function mondayOf(dateInput) {
  const d = new Date(`${dateInput}T00:00:00Z`);
  const dayIndex = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - dayIndex * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(value, days) {
  return new Date(new Date(value).getTime() + days * DAY_MS);
}

// Key ('mon'..'sun') of today in local time.
export function todayKey() {
  return DAYS[(new Date().getDay() + 6) % 7];
}

export function workoutSetCount(workout) {
  return workout.exercises.reduce((sum, e) => sum + e.sets.length, 0);
}

export function workoutVolume(workout) {
  return workout.exercises.reduce(
    (sum, e) => sum + e.sets.reduce((s, set) => s + set.reps * set.weight, 0),
    0
  );
}

export function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}
