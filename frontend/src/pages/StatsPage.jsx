import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api/client';
import ChartCard, { AXIS_PROPS, CHART_COLORS, ChartTooltip } from '../components/ChartCard';
import ExerciseImage from '../components/ExerciseImage';
import { Badge, ButtonLink, Card, EmptyState, ErrorAlert, Field, PageHeader, Select, Spinner, StatCard } from '../components/ui';
import { formatDate, formatNumber } from '../utils/format';

const WEEK_OPTIONS = [8, 12, 26, 52];

const shortDate = (value) => formatDate(value, { year: undefined });
const kg = (value) => `${formatNumber(value)} kg`;

export default function StatsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [records, setRecords] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [weeks, setWeeks] = useState(12);
  const [exerciseStats, setExerciseStats] = useState(null);
  const [error, setError] = useState('');

  const loadRecords = useCallback(async () => {
    setError('');
    try {
      setRecords(await api.get('/stats/records'));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    setWeekly(null);
    api.get(`/stats/weekly?weeks=${weeks}`).then(setWeekly).catch((err) => setError(err.message));
  }, [weeks]);

  // Selected exercise comes from the URL (?exercise=id) so it can be linked to; default to the most trained one.
  const fallbackId = records?.length ? [...records].sort((a, b) => b.totalVolume - a.totalVolume)[0].exerciseId : '';
  const selectedId = searchParams.get('exercise') || fallbackId;

  useEffect(() => {
    if (!selectedId) return undefined;
    let cancelled = false;
    setExerciseStats(null);
    api
      .get(`/stats/exercise/${selectedId}`)
      .then((data) => !cancelled && setExerciseStats(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  if (!records) return error ? <ErrorAlert message={error} onRetry={loadRecords} /> : <Spinner />;

  if (records.length === 0) {
    return (
      <>
        <PageHeader title="Statistics" />
        <EmptyState title="No statistics yet" action={<ButtonLink to="/workouts/new">Log a workout</ButtonLink>}>
          Log a few workouts with sets and weights to see your progress here.
        </EmptyState>
      </>
    );
  }

  // The selected exercise may not be in the records (e.g. a stale link); keep it selectable anyway.
  const options = records.some((r) => r.exerciseId === selectedId) || !exerciseStats
    ? records
    : [...records, { exerciseId: selectedId, name: exerciseStats.exercise.name }];

  const totalWorkouts = weekly?.reduce((sum, w) => sum + w.workouts, 0) ?? 0;

  return (
    <>
      <PageHeader title="Statistics" subtitle="Progress per exercise, weekly consistency and personal records." />
      <ErrorAlert message={error} />

      <Card className="mb-6 p-4">
        <Field label="Exercise" htmlFor="stats-exercise" className="sm:max-w-sm">
          <Select id="stats-exercise" value={selectedId} onChange={(e) => setSearchParams({ exercise: e.target.value })}>
            {options.map((r) => (
              <option key={r.exerciseId} value={r.exerciseId}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      {!exerciseStats ? (
        <Spinner />
      ) : (
        <>
          <Card className="mb-6 grid gap-5 p-4 sm:grid-cols-[18rem_1fr] sm:items-center">
            <ExerciseImage exercise={exerciseStats.exercise} size="lg" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">{exerciseStats.exercise.name}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge color="emerald">{exerciseStats.exercise.muscleGroup}</Badge>
                <Badge color="sky">{exerciseStats.exercise.equipment}</Badge>
                {exerciseStats.exercise.isCustom && <Badge color="amber">custom</Badge>}
              </div>
              {exerciseStats.exercise.description && <p className="mt-3 text-sm text-slate-600">{exerciseStats.exercise.description}</p>}
            </div>
          </Card>

          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Best set"
              value={exerciseStats.bestSet ? `${formatNumber(exerciseStats.bestSet.weight)} kg × ${exerciseStats.bestSet.reps}` : '—'}
              hint={exerciseStats.bestSet ? formatDate(exerciseStats.bestSet.date) : 'no sets logged'}
            />
            <StatCard label="Total volume" value={kg(exerciseStats.totalVolume)} hint="reps × weight" />
            <StatCard label="Sessions" value={exerciseStats.sessions} hint="workouts with this exercise" />
            <StatCard label="Sets / reps" value={`${exerciseStats.totalSets} / ${exerciseStats.totalReps}`} />
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Max weight over time"
              subtitle={`${exerciseStats.exercise.name} · heaviest set per day (kg)`}
              rows={exerciseStats.progress}
              columns={[
                { key: 'date', label: 'Date', format: (v) => formatDate(v) },
                { key: 'maxWeight', label: 'Max weight', align: 'right', format: kg },
                { key: 'sets', label: 'Sets', align: 'right' },
              ]}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={exerciseStats.progress} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} {...AXIS_PROPS} />
                  <YAxis width={44} domain={[0, 'auto']} {...AXIS_PROPS} />
                  <Tooltip
                    cursor={{ stroke: CHART_COLORS.axis, strokeDasharray: '3 3' }}
                    content={<ChartTooltip labelFormatter={(d) => formatDate(d)} valueFormatter={kg} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="maxWeight"
                    name="Max weight"
                    stroke={CHART_COLORS.weight}
                    strokeWidth={2}
                    dot={{ r: 4, fill: CHART_COLORS.weight, stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Volume per session"
              subtitle={`${exerciseStats.exercise.name} · reps × weight per day (kg)`}
              rows={exerciseStats.progress}
              columns={[
                { key: 'date', label: 'Date', format: (v) => formatDate(v) },
                { key: 'volume', label: 'Volume', align: 'right', format: kg },
                { key: 'totalReps', label: 'Reps', align: 'right' },
              ]}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={exerciseStats.progress} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} {...AXIS_PROPS} />
                  <YAxis width={52} {...AXIS_PROPS} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} content={<ChartTooltip labelFormatter={(d) => formatDate(d)} valueFormatter={kg} />} />
                  <Bar dataKey="volume" name="Volume" fill={CHART_COLORS.volume} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}

      <div className="mb-6">
        <ChartCard
          title="Workouts per week"
          subtitle={weekly ? `${totalWorkouts} workouts in the last ${weeks} weeks` : 'Loading…'}
          rows={weekly}
          columns={[
            { key: 'weekStart', label: 'Week of', format: (v) => formatDate(v) },
            { key: 'workouts', label: 'Workouts', align: 'right' },
            { key: 'volume', label: 'Volume', align: 'right', format: kg },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly || []} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="weekStart" tickFormatter={shortDate} minTickGap={16} {...AXIS_PROPS} />
              <YAxis width={32} allowDecimals={false} {...AXIS_PROPS} />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                content={<ChartTooltip labelFormatter={(d) => `Week of ${formatDate(d)}`} />}
              />
              <Bar dataKey="workouts" name="Workouts" fill={CHART_COLORS.weight} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <div className="mt-2 flex justify-end gap-1">
          {WEEK_OPTIONS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWeeks(w)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${w === weeks ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {w}w
            </button>
          ))}
        </div>
      </div>

      <Card className="p-0">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Personal records</h2>
          <p className="text-xs text-slate-500">Heaviest set per exercise. Click a row to see its progress.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2 font-medium">Exercise</th>
                <th className="px-3 py-2 text-right font-medium">Max weight</th>
                <th className="px-3 py-2 text-right font-medium">Reps</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 text-right font-medium">Max reps</th>
                <th className="px-5 py-2 text-right font-medium">Total volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r) => (
                <tr
                  key={r.exerciseId}
                  className={`cursor-pointer hover:bg-slate-50 ${r.exerciseId === selectedId ? 'bg-emerald-50/60' : ''}`}
                  onClick={() => {
                    setSearchParams({ exercise: r.exerciseId });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <td className="px-5 py-2.5">
                    <span className="font-medium text-slate-900">{r.name}</span> <Badge color="emerald">{r.muscleGroup}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{kg(r.maxWeight)}</td>
                  <td className="px-3 py-2.5 text-right">{r.repsAtMax}</td>
                  <td className="px-3 py-2.5">
                    <Link to={`/workouts/${r.workoutId}`} className="text-emerald-700 hover:underline" onClick={(e) => e.stopPropagation()}>
                      {formatDate(r.date)}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-right">{r.maxReps}</td>
                  <td className="px-5 py-2.5 text-right">{kg(r.totalVolume)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
