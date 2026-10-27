import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Button, ButtonLink, Card, EmptyState, ErrorAlert, Input, PageHeader, Spinner } from '../components/ui';
import { formatDate, formatNumber, workoutSetCount, workoutVolume } from '../utils/format';

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setWorkouts(await api.get('/workouts'));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(workout) {
    if (!window.confirm(`Delete workout "${workout.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/workouts/${workout._id}`);
      setWorkouts((list) => list.filter((w) => w._id !== workout._id));
    } catch (err) {
      setError(err.message);
    }
  }

  const term = search.trim().toLowerCase();
  const visible = (workouts || []).filter(
    (w) => !term || w.name.toLowerCase().includes(term) || w.exercises.some((e) => e.exercise?.name.toLowerCase().includes(term))
  );

  return (
    <>
      <PageHeader title="Workouts" subtitle="Create, edit and review your workouts." actions={<ButtonLink to="/workouts/new">+ New workout</ButtonLink>} />
      <ErrorAlert message={error} onRetry={workouts ? undefined : load} />

      {!workouts ? (
        !error && <Spinner />
      ) : workouts.length === 0 ? (
        <EmptyState title="No workouts yet" action={<ButtonLink to="/workouts/new">Log your first workout</ButtonLink>}>
          Add exercises and log your sets, reps and weights.
        </EmptyState>
      ) : (
        <>
          <Input
            className="mb-4 sm:max-w-xs"
            placeholder="Search by workout or exercise…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search workouts"
          />
          {visible.length === 0 ? (
            <EmptyState title="No workouts match your search" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {visible.map((w) => (
                <Card key={w._id} className="flex flex-col p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/workouts/${w._id}`} className="font-semibold text-slate-900 hover:text-emerald-700">
                        {w.name}
                      </Link>
                      <p className="text-sm text-slate-500">{formatDate(w.date, { weekday: 'short' })}</p>
                    </div>
                    <span className="shrink-0 text-right text-xs text-slate-500">
                      {workoutSetCount(w)} sets
                      <br />
                      {formatNumber(workoutVolume(w))} kg
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm text-slate-600">
                    {w.exercises.length ? w.exercises.map((e) => e.exercise?.name ?? 'Deleted exercise').join(' · ') : 'No exercises'}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <ButtonLink to={`/workouts/${w._id}`} variant="secondary" size="sm">
                      View
                    </ButtonLink>
                    <ButtonLink to={`/workouts/${w._id}/edit`} variant="secondary" size="sm">
                      Edit
                    </ButtonLink>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(w)}>
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
