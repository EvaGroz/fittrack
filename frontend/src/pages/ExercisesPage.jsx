import { useCallback, useEffect, useState } from 'react';
import { api, qs } from '../api/client';
import ExerciseFormModal from '../components/ExerciseFormModal';
import ExerciseImage from '../components/ExerciseImage';
import { Badge, Button, Card, EmptyState, ErrorAlert, Input, PageHeader, Select, Spinner } from '../components/ui';
import useDebounce from '../hooks/useDebounce';

export default function ExercisesPage() {
  const [meta, setMeta] = useState({ muscleGroups: [], equipment: [] });
  const [filters, setFilters] = useState({ search: '', muscleGroup: '', equipment: '', custom: '' });
  const [exercises, setExercises] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState({ open: false, exercise: null });
  const debouncedSearch = useDebounce(filters.search);

  useEffect(() => {
    api.get('/exercises/meta').then(setMeta).catch((err) => setError(err.message));
  }, []);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api.get(
        `/exercises${qs({ search: debouncedSearch, muscleGroup: filters.muscleGroup, equipment: filters.equipment, custom: filters.custom })}`
      );
      setExercises(data);
    } catch (err) {
      setError(err.message);
    }
  }, [debouncedSearch, filters.muscleGroup, filters.equipment, filters.custom]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (field) => (e) => setFilters((f) => ({ ...f, [field]: e.target.value }));
  const hasFilters = Object.values(filters).some(Boolean);

  async function handleDelete(exercise) {
    if (!window.confirm(`Delete "${exercise.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/exercises/${exercise._id}`);
      setExercises((list) => list.filter((e) => e._id !== exercise._id));
    } catch (err) {
      setError(err.message);
    }
  }

  function handleSaved() {
    setModal({ open: false, exercise: null });
    load();
  }

  return (
    <>
      <PageHeader
        title="Exercise library"
        subtitle="Browse the built-in exercises or add your own."
        actions={<Button onClick={() => setModal({ open: true, exercise: null })}>+ Custom exercise</Button>}
      />

      <Card className="mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input placeholder="Search by name…" value={filters.search} onChange={setFilter('search')} aria-label="Search" />
          <Select value={filters.muscleGroup} onChange={setFilter('muscleGroup')} aria-label="Muscle group">
            <option value="">All muscle groups</option>
            {meta.muscleGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
          <Select value={filters.equipment} onChange={setFilter('equipment')} aria-label="Equipment">
            <option value="">All equipment</option>
            {meta.equipment.map((eq) => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </Select>
          <Select value={filters.custom} onChange={setFilter('custom')} aria-label="Source">
            <option value="">Library + custom</option>
            <option value="false">Library only</option>
            <option value="true">My custom only</option>
          </Select>
        </div>
        {hasFilters && (
          <button
            type="button"
            className="mt-3 text-sm font-medium text-emerald-700 hover:underline"
            onClick={() => setFilters({ search: '', muscleGroup: '', equipment: '', custom: '' })}
          >
            Clear filters
          </button>
        )}
      </Card>

      <ErrorAlert message={error} onRetry={exercises ? undefined : load} />

      {!exercises ? (
        !error && <Spinner />
      ) : exercises.length === 0 ? (
        <EmptyState title="No exercises match your filters">Try a different search or add a custom exercise.</EmptyState>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">{exercises.length} exercises</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {exercises.map((exercise) => (
              <Card key={exercise._id} className="flex flex-col overflow-hidden p-0">
                <ExerciseImage exercise={exercise} size="banner" />
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">{exercise.name}</h3>
                    {exercise.isCustom && <Badge color="amber">custom</Badge>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge color="emerald">{exercise.muscleGroup}</Badge>
                    <Badge color="sky">{exercise.equipment}</Badge>
                  </div>
                  {exercise.description && <p className="mt-3 flex-1 text-sm text-slate-600">{exercise.description}</p>}
                  {exercise.isCustom && (
                    <div className="mt-4 flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setModal({ open: true, exercise })}>
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(exercise)}>
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <ExerciseFormModal
        open={modal.open}
        exercise={modal.exercise}
        meta={meta}
        onClose={() => setModal({ open: false, exercise: null })}
        onSaved={handleSaved}
      />
    </>
  );
}
