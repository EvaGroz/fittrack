import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../api/client';
import { Button, Card, EmptyState, ErrorAlert, Field, Input, PageHeader, Spinner } from '../components/ui';
import { addDays, formatDate, formatNumber, mondayOf, toDateInput, todayInput, workoutSetCount, workoutVolume } from '../utils/format';

function daysAgo(n) {
  return toDateInput(addDays(`${todayInput()}T00:00:00Z`, -n));
}

const RANGES = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last year', days: 365 },
  { label: 'All time', days: null },
];

export default function HistoryPage() {
  const [range, setRange] = useState({ from: daysAgo(90), to: todayInput() });
  const [workouts, setWorkouts] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setWorkouts(null);
    try {
      setWorkouts(await api.get(`/workouts${qs(range)}`));
    } catch (err) {
      setError(err.message);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  // Group workouts (already sorted newest first) by the Monday of their week.
  const weeks = useMemo(() => {
    const groups = new Map();
    for (const w of workouts || []) {
      const key = mondayOf(toDateInput(w.date));
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(w);
    }
    return [...groups.entries()].map(([weekStart, items]) => ({
      weekStart,
      items,
      volume: items.reduce((sum, w) => sum + workoutVolume(w), 0),
    }));
  }, [workouts]);

  const totalVolume = weeks.reduce((sum, w) => sum + w.volume, 0);

  return (
    <>
      <PageHeader title="History" subtitle="Your past workouts, grouped by week." />

      <Card className="mb-6 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-2 gap-3 sm:w-96">
            <Field label="From" htmlFor="from">
              <Input id="from" type="date" value={range.from} max={range.to || undefined} onChange={(e) => setRange({ ...range, from: e.target.value })} />
            </Field>
            <Field label="To" htmlFor="to">
              <Input id="to" type="date" value={range.to} min={range.from || undefined} onChange={(e) => setRange({ ...range, to: e.target.value })} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            {RANGES.map((r) => (
              <Button
                key={r.label}
                variant={(r.days === null ? range.from === '' : range.from === daysAgo(r.days)) && range.to === todayInput() ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setRange({ from: r.days === null ? '' : daysAgo(r.days), to: todayInput() })}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <ErrorAlert message={error} onRetry={load} />

      {!workouts ? (
        !error && <Spinner />
      ) : workouts.length === 0 ? (
        <EmptyState title="No workouts in this period">Try a wider date range.</EmptyState>
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-500">
            {workouts.length} workouts · {weeks.length} weeks · {formatNumber(totalVolume)} kg total volume
          </p>
          <div className="space-y-6">
            {weeks.map((week) => (
              <section key={week.weekStart}>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h2 className="font-semibold text-slate-900">
                    Week of {formatDate(week.weekStart, { year: undefined })} – {formatDate(addDays(week.weekStart, 6))}
                  </h2>
                  <span className="shrink-0 text-xs text-slate-500">
                    {week.items.length} workout{week.items.length === 1 ? '' : 's'} · {formatNumber(week.volume)} kg
                  </span>
                </div>
                <Card className="divide-y divide-slate-100 p-0">
                  {week.items.map((w) => (
                    <Link key={w._id} to={`/workouts/${w._id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50">
                      <div className="w-14 shrink-0 text-center">
                        <p className="text-xs uppercase text-slate-500">{formatDate(w.date, { weekday: 'short', year: undefined, month: undefined, day: undefined })}</p>
                        <p className="text-lg font-bold text-slate-800">{formatDate(w.date, { year: undefined, month: undefined, day: 'numeric' })}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{w.name}</p>
                        <p className="truncate text-sm text-slate-500">
                          {w.exercises.map((e) => e.exercise?.name ?? 'Deleted exercise').join(' · ') || 'No exercises'}
                        </p>
                      </div>
                      <div className="hidden shrink-0 text-right text-sm text-slate-500 sm:block">
                        <p>{workoutSetCount(w)} sets</p>
                        <p>{formatNumber(workoutVolume(w))} kg</p>
                      </div>
                    </Link>
                  ))}
                </Card>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}
