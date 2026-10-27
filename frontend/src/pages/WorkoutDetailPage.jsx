import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import ExerciseImage from '../components/ExerciseImage';
import { Badge, Button, ButtonLink, Card, EmptyState, ErrorAlert, PageHeader, Spinner, StatCard } from '../components/ui';
import { formatDate, formatNumber, workoutSetCount, workoutVolume } from '../utils/format';

export default function WorkoutDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/workouts/${id}`).then(setWorkout).catch((err) => setError(err.message));
  }, [id]);

  async function handleDelete() {
    if (!window.confirm(`Delete workout "${workout.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/workouts/${id}`);
      navigate('/workouts');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!workout) {
    return error ? (
      <EmptyState title={error} action={<ButtonLink to="/workouts" variant="secondary">Back to workouts</ButtonLink>} />
    ) : (
      <Spinner />
    );
  }

  return (
    <>
      <PageHeader
        title={workout.name}
        subtitle={formatDate(workout.date, { weekday: 'long', month: 'long' })}
        actions={
          <>
            <ButtonLink to="/workouts" variant="ghost">
              ← All workouts
            </ButtonLink>
            <ButtonLink to={`/workouts/${id}/edit`} variant="secondary">
              Edit
            </ButtonLink>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      />
      <ErrorAlert message={error} />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Exercises" value={workout.exercises.length} />
        <StatCard label="Sets" value={workoutSetCount(workout)} />
        <StatCard label="Volume" value={`${formatNumber(workoutVolume(workout))} kg`} />
      </div>

      {workout.notes && (
        <Card className="mb-6">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Notes</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600">{workout.notes}</p>
        </Card>
      )}

      {workout.exercises.length === 0 ? (
        <EmptyState title="This workout has no exercises" action={<ButtonLink to={`/workouts/${id}/edit`}>Add exercises</ButtonLink>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {workout.exercises.map((entry, i) => {
            const volume = entry.sets.reduce((s, set) => s + set.reps * set.weight, 0);
            const best = Math.max(0, ...entry.sets.map((s) => s.weight));
            return (
              <Card key={entry._id || i} className="p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <ExerciseImage exercise={entry.exercise} size="sm" />
                    {entry.exercise ? (
                      <Link to={`/stats?exercise=${entry.exercise._id}`} className="font-semibold text-slate-900 hover:text-emerald-700" title="View progress">
                        {entry.exercise.name}
                      </Link>
                    ) : (
                      <h3 className="font-semibold text-slate-900">Deleted exercise</h3>
                    )}
                  </div>
                  {entry.exercise && <Badge color="emerald">{entry.exercise.muscleGroup}</Badge>}
                </div>
                {entry.sets.length === 0 ? (
                  <p className="text-sm text-slate-500">No sets logged.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="pb-2 font-medium">Set</th>
                        <th className="pb-2 font-medium">Reps</th>
                        <th className="pb-2 font-medium">Weight</th>
                        <th className="pb-2 text-right font-medium">Volume</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {entry.sets.map((set) => (
                        <tr key={set.setNumber}>
                          <td className="py-1.5 text-slate-500">{set.setNumber}</td>
                          <td className="py-1.5">{set.reps}</td>
                          <td className="py-1.5">{formatNumber(set.weight)} kg</td>
                          <td className="py-1.5 text-right text-slate-500">{formatNumber(set.reps * set.weight)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p className="mt-3 text-xs text-slate-500">
                  Top weight {formatNumber(best)} kg · Volume {formatNumber(volume)} kg
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
