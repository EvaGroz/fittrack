import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import ExercisePicker from '../components/ExercisePicker';
import { Badge, Button, Card, EmptyState, ErrorAlert, Field, Input, PageHeader, Spinner, Textarea } from '../components/ui';
import { formatNumber, toDateInput, todayInput } from '../utils/format';

let keySeq = 0;
const nextKey = () => ++keySeq;

// New sets copy the previous set's values, which is how most people log consecutive sets.
const newSet = (prev) => ({ reps: prev?.reps ?? '', weight: prev?.weight ?? '' });

function parseSets(item) {
  return item.sets.map((set, i) => {
    const label = `${item.exercise.name}, set ${i + 1}`;
    const reps = Number(set.reps);
    if (set.reps === '' || !Number.isInteger(reps) || reps < 0) throw new Error(`Enter a whole number of reps for ${label}.`);
    const weight = set.weight === '' ? 0 : Number(set.weight);
    if (!Number.isFinite(weight) || weight < 0) throw new Error(`Enter a valid weight for ${label}.`);
    return { setNumber: i + 1, reps, weight };
  });
}

export default function WorkoutEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({ name: '', date: searchParams.get('date') || todayInput(), notes: '' });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/workouts/${id}`)
      .then((w) => {
        setForm({ name: w.name, date: toDateInput(w.date), notes: w.notes || '' });
        setItems(
          w.exercises
            .filter((e) => e.exercise)
            .map((e) => ({
              key: nextKey(),
              exercise: e.exercise,
              sets: e.sets.map((s) => ({ reps: String(s.reps), weight: String(s.weight) })),
            }))
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const updateItem = (key, fn) => setItems((list) => list.map((it) => (it.key === key ? fn(it) : it)));

  function addExercise(exercise) {
    setItems((list) => [...list, { key: nextKey(), exercise, sets: [newSet()] }]);
    setPickerOpen(false);
  }

  function updateSet(key, index, field, value) {
    updateItem(key, (it) => ({ ...it, sets: it.sets.map((s, i) => (i === index ? { ...s, [field]: value } : s)) }));
  }

  function moveItem(index, delta) {
    setItems((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      const copy = [...list];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Give your workout a name.');
    if (!form.date) return setError('Pick a date.');

    let exercises;
    try {
      exercises = items.map((it) => ({ exercise: it.exercise._id, sets: parseSets(it) }));
    } catch (err) {
      return setError(err.message);
    }

    setSaving(true);
    const body = { name: form.name.trim(), date: form.date, notes: form.notes.trim(), exercises };
    try {
      const saved = isEdit ? await api.put(`/workouts/${id}`, body) : await api.post('/workouts', body);
      navigate(`/workouts/${saved._id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  const totalVolume = items.reduce(
    (sum, it) => sum + it.sets.reduce((s, set) => s + (Number(set.reps) || 0) * (Number(set.weight) || 0), 0),
    0
  );
  const totalSets = items.reduce((sum, it) => sum + it.sets.length, 0);

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        title={isEdit ? 'Edit workout' : 'New workout'}
        actions={
          <>
            <Link to={isEdit ? `/workouts/${id}` : '/workouts'} className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
              Cancel
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save workout'}
            </Button>
          </>
        }
      />
      <ErrorAlert message={error} />

      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Name" htmlFor="w-name" className="sm:col-span-2">
            <Input id="w-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Push day" maxLength={100} autoFocus={!isEdit} />
          </Field>
          <Field label="Date" htmlFor="w-date">
            <Input id="w-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Notes" htmlFor="w-notes" className="sm:col-span-3">
            <Textarea id="w-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="How did it feel?" maxLength={2000} />
          </Field>
        </div>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Exercises</h2>
        <span className="text-sm text-slate-500">
          {totalSets} sets · {formatNumber(totalVolume)} kg volume
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No exercises added yet" action={<Button onClick={() => setPickerOpen(true)}>+ Add exercise</Button>}>
          Add exercises and log the sets you did.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <Card key={item.key} className="p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">
                    {index + 1}. {item.exercise.name}
                  </h3>
                  <Badge color="emerald">{item.exercise.muscleGroup}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => moveItem(index, -1)} disabled={index === 0} aria-label="Move up">
                    ↑
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} aria-label="Move down">
                    ↓
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setItems((list) => list.filter((it) => it.key !== item.key))}>
                    Remove
                  </Button>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="w-12 pb-2 font-medium">Set</th>
                    <th className="pb-2 font-medium">Reps</th>
                    <th className="pb-2 pl-2 font-medium">Weight (kg)</th>
                    <th className="w-10 pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {item.sets.map((set, i) => (
                    <tr key={i}>
                      <td className="py-1 font-medium text-slate-500">{i + 1}</td>
                      <td className="py-1">
                        <Input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1"
                          value={set.reps}
                          onChange={(e) => updateSet(item.key, i, 'reps', e.target.value)}
                          aria-label={`Reps for set ${i + 1}`}
                        />
                      </td>
                      <td className="py-1 pl-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.5"
                          value={set.weight}
                          onChange={(e) => updateSet(item.key, i, 'weight', e.target.value)}
                          aria-label={`Weight for set ${i + 1}`}
                        />
                      </td>
                      <td className="py-1 text-right">
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => updateItem(item.key, (it) => ({ ...it, sets: it.sets.filter((_, idx) => idx !== i) }))}
                          aria-label={`Remove set ${i + 1}`}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => updateItem(item.key, (it) => ({ ...it, sets: [...it.sets, newSet(it.sets[it.sets.length - 1])] }))}
              >
                + Add set
              </Button>
            </Card>
          ))}
          <Button variant="secondary" onClick={() => setPickerOpen(true)} className="w-full border-dashed">
            + Add exercise
          </Button>
        </div>
      )}

      <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={addExercise} />
    </form>
  );
}
