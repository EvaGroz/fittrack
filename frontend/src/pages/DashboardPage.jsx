import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ButtonLink, Card, EmptyState, ErrorAlert, PageHeader, Spinner, StatCard } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import {
  DAY_LABELS,
  addDays,
  formatDate,
  formatNumber,
  mondayOf,
  toDateInput,
  todayInput,
  todayKey,
  workoutSetCount,
  workoutVolume,
} from '../utils/format';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [summary, recent, plans] = await Promise.all([
        api.get('/stats/summary'),
        api.get('/workouts?limit=5'),
        api.get('/plans'),
      ]);
      const thisMonday = mondayOf(todayInput());
      const currentPlan = plans.find((p) => toDateInput(p.weekStart) === thisMonday) || null;
      setData({ summary, recent, currentPlan });
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleDone(day, done) {
    try {
      const plan = await api.patch(`/plans/${data.currentPlan._id}/days/${day}`, { done });
      setData((d) => ({ ...d, currentPlan: plan }));
    } catch (err) {
      setError(err.message);
    }
  }

  if (!data) {
    return error ? <ErrorAlert message={error} onRetry={load} /> : <Spinner />;
  }

  const { summary, recent, currentPlan } = data;
  const today = todayKey();

  return (
    <>
      <PageHeader
        title={`Hi, ${user.name.split(' ')[0]}`}
        subtitle="Here's how your training is going."
        actions={
          <>
            <ButtonLink to="/stats" variant="secondary">
              View stats
            </ButtonLink>
            <ButtonLink to="/workouts/new">+ Log workout</ButtonLink>
          </>
        }
      />
      <ErrorAlert message={error} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Workouts" value={summary.totalWorkouts} hint="all time" />
        <StatCard label="This week" value={summary.workoutsThisWeek} hint="workouts" />
        <StatCard label="Total sets" value={formatNumber(summary.totalSets)} />
        <StatCard label="Total volume" value={`${formatNumber(summary.totalVolume)} kg`} hint="reps × weight" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">This week's plan</h2>
            {currentPlan && (
              <Link to={`/plans/${currentPlan._id}`} className="text-sm font-medium text-emerald-700 hover:underline">
                Open plan
              </Link>
            )}
          </div>

          {currentPlan ? (
            <ul className="divide-y divide-slate-100">
              {currentPlan.days.map((day, i) => {
                const items = [day.workout?.name, ...day.exercises.map((e) => e.name)].filter(Boolean);
                return (
                  <li key={day.day} className={`flex items-center gap-3 py-2.5 ${day.day === today ? 'font-medium' : ''}`}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-emerald-600"
                      checked={day.done}
                      onChange={(e) => toggleDone(day.day, e.target.checked)}
                      aria-label={`Mark ${DAY_LABELS[day.day]} as done`}
                    />
                    <span className="w-28 shrink-0 text-sm text-slate-700">
                      {DAY_LABELS[day.day]}
                      <span className="block text-xs font-normal text-slate-400">
                        {formatDate(addDays(currentPlan.weekStart, i), { year: undefined })}
                      </span>
                    </span>
                    <span className={`min-w-0 flex-1 truncate text-sm ${day.done ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                      {items.length ? items.join(', ') : <span className="italic text-slate-400">Rest day</span>}
                    </span>
                    {day.day === today && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Today</span>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No plan for this week" action={<ButtonLink to="/plans" variant="secondary">Create a plan</ButtonLink>}>
              Plan your week so you know what to train each day.
            </EmptyState>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent workouts</h2>
            <Link to="/history" className="text-sm font-medium text-emerald-700 hover:underline">
              History
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState title="No workouts yet" action={<ButtonLink to="/workouts/new" variant="secondary">Log your first workout</ButtonLink>} />
          ) : (
            <ul className="space-y-2">
              {recent.map((w) => (
                <li key={w._id}>
                  <Link to={`/workouts/${w._id}`} className="block rounded-lg border border-slate-100 px-3 py-2.5 hover:border-emerald-200 hover:bg-emerald-50/50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-slate-800">{w.name}</span>
                      <span className="shrink-0 text-xs text-slate-500">{formatDate(w.date)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {w.exercises.length} exercises · {workoutSetCount(w)} sets · {formatNumber(workoutVolume(w))} kg
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
