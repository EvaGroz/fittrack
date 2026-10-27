import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import ExercisePicker from '../components/ExercisePicker';
import { Button, ButtonLink, Card, EmptyState, ErrorAlert, Field, Input, PageHeader, Select, Spinner, Textarea } from '../components/ui';
import { DAY_LABELS, addDays, formatDate, mondayOf, toDateInput, todayInput } from '../utils/format';

function DayCard({ day, date, isToday, workouts, busy, onPatch, onAddExercise }) {
  const [notes, setNotes] = useState(day.notes);

  useEffect(() => {
    setNotes(day.notes);
  }, [day.notes]);

  const exerciseIds = day.exercises.map((e) => e._id);

  return (
    <Card className={`flex flex-col p-4 ${day.done ? 'bg-emerald-50/60' : ''} ${isToday ? 'ring-2 ring-emerald-400' : ''}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">
            {DAY_LABELS[day.day]}
            {isToday && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Today</span>}
          </h3>
          <p className="text-xs text-slate-500">{formatDate(date, { weekday: undefined })}</p>
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 accent-emerald-600"
            checked={day.done}
            disabled={busy}
            onChange={(e) => onPatch({ done: e.target.checked })}
          />
          Done
        </label>
      </div>

      <Field label="Workout" htmlFor={`workout-${day.day}`} className="mb-3">
        <Select
          id={`workout-${day.day}`}
          value={day.workout?._id || ''}
          disabled={busy}
          onChange={(e) => onPatch({ workout: e.target.value || null })}
        >
          <option value="">— None —</option>
          {workouts.map((w) => (
            <option key={w._id} value={w._id}>
              {w.name} ({formatDate(w.date)})
            </option>
          ))}
        </Select>
      </Field>
      {day.workout && (
        <Link to={`/workouts/${day.workout._id}`} className="-mt-2 mb-3 text-xs font-medium text-emerald-700 hover:underline">
          View workout →
        </Link>
      )}

      <div className="mb-3">
        <p className="mb-1 text-sm font-medium text-slate-700">Exercises</p>
        {day.exercises.length === 0 ? (
          <p className="text-xs text-slate-400">No extra exercises.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {day.exercises.map((ex) => (
              <li key={ex._id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2.5 pr-1 text-xs text-slate-700">
                {ex.name}
                <button
                  type="button"
                  className="rounded-full px-1 text-slate-400 hover:bg-slate-200 hover:text-red-600"
                  disabled={busy}
                  onClick={() => onPatch({ exercises: exerciseIds.filter((x) => x !== ex._id) })}
                  aria-label={`Remove ${ex.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="mt-2 text-xs font-medium text-emerald-700 hover:underline" onClick={onAddExercise} disabled={busy}>
          + Add exercise
        </button>
      </div>

      <Field label="Notes" htmlFor={`notes-${day.day}`} className="flex-1">
        <Textarea
          id={`notes-${day.day}`}
          rows={2}
          value={notes}
          maxLength={1000}
          placeholder="e.g. Rest, 30 min cardio…"
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== day.notes && onPatch({ notes })}
        />
      </Field>

      <Link to={`/workouts/new?date=${toDateInput(date)}`} className="mt-3 text-xs font-medium text-slate-500 hover:text-emerald-700">
        + Log a workout for this day
      </Link>
    </Card>
  );
}

export default function PlanEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [header, setHeader] = useState({ name: '', weekStart: '' });
  const [busyDay, setBusyDay] = useState(null);
  const [savingHeader, setSavingHeader] = useState(false);
  const [pickerDay, setPickerDay] = useState(null);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  const applyPlan = useCallback((p) => {
    setPlan(p);
    setHeader({ name: p.name, weekStart: toDateInput(p.weekStart) });
  }, []);

  useEffect(() => {
    Promise.all([api.get(`/plans/${id}`), api.get('/workouts')])
      .then(([p, w]) => {
        applyPlan(p);
        setWorkouts(w);
      })
      .catch((err) => {
        setError(err.message);
        if (err.status === 404 || err.status === 400) setNotFound(true);
      });
  }, [id, applyPlan]);

  async function patchDay(day, body) {
    setBusyDay(day);
    setError('');
    try {
      setPlan(await api.patch(`/plans/${id}/days/${day}`, body));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyDay(null);
    }
  }

  async function saveHeader(e) {
    e.preventDefault();
    if (!header.name.trim()) return setError('The plan needs a name.');
    setSavingHeader(true);
    setError('');
    try {
      applyPlan(await api.put(`/plans/${id}`, { name: header.name.trim(), weekStart: header.weekStart }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingHeader(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/plans/${id}`);
      navigate('/plans');
    } catch (err) {
      setError(err.message);
    }
  }

  function addExercise(exercise) {
    const day = plan.days.find((d) => d.day === pickerDay);
    setPickerDay(null);
    patchDay(day.day, { exercises: [...day.exercises.map((e) => e._id), exercise._id] });
  }

  if (notFound) {
    return <EmptyState title={error} action={<ButtonLink to="/plans" variant="secondary">Back to plans</ButtonLink>} />;
  }
  if (!plan) return error ? <ErrorAlert message={error} /> : <Spinner />;

  const headerChanged = header.name !== plan.name || header.weekStart !== toDateInput(plan.weekStart);
  const isCurrentWeek = toDateInput(plan.weekStart) === mondayOf(todayInput());
  const todayStr = todayInput();
  const doneCount = plan.days.filter((d) => d.done).length;

  return (
    <>
      <PageHeader
        title={plan.name}
        subtitle={`${formatDate(plan.weekStart, { year: undefined })} – ${formatDate(addDays(plan.weekStart, 6))} · ${doneCount}/7 days done`}
        actions={
          <>
            <ButtonLink to="/plans" variant="ghost">
              ← All plans
            </ButtonLink>
            <Button variant="danger" onClick={handleDelete}>
              Delete plan
            </Button>
          </>
        }
      />
      <ErrorAlert message={error} />

      <Card className="mb-6 p-4">
        <form onSubmit={saveHeader} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
          <Field label="Plan name" htmlFor="plan-name">
            <Input id="plan-name" value={header.name} onChange={(e) => setHeader({ ...header, name: e.target.value })} maxLength={100} />
          </Field>
          <Field label="Week starting" htmlFor="plan-week">
            <Input id="plan-week" type="date" value={header.weekStart} onChange={(e) => setHeader({ ...header, weekStart: e.target.value })} />
          </Field>
          <Button type="submit" variant="secondary" disabled={!headerChanged || savingHeader}>
            {savingHeader ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </Card>

      {workouts.length === 0 && (
        <p className="mb-4 text-sm text-slate-500">
          Tip: <Link to="/workouts/new" className="font-medium text-emerald-700 hover:underline">create a workout</Link> to assign it to a day, or add individual exercises below.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plan.days.map((day, i) => {
          const date = addDays(plan.weekStart, i);
          return (
            <DayCard
              key={day.day}
              day={day}
              date={date}
              isToday={isCurrentWeek && toDateInput(date) === todayStr}
              workouts={workouts}
              busy={busyDay === day.day}
              onPatch={(body) => patchDay(day.day, body)}
              onAddExercise={() => setPickerDay(day.day)}
            />
          );
        })}
      </div>

      <ExercisePicker
        open={pickerDay !== null}
        onClose={() => setPickerDay(null)}
        onSelect={addExercise}
        excludeIds={pickerDay ? plan.days.find((d) => d.day === pickerDay).exercises.map((e) => e._id) : []}
      />
    </>
  );
}
