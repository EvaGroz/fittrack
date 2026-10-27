import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Badge, Button, ButtonLink, Card, EmptyState, ErrorAlert, Field, Input, PageHeader, Spinner } from '../components/ui';
import { addDays, formatDate, mondayOf, toDateInput, todayInput } from '../utils/format';

function planProgress(plan) {
  const planned = plan.days.filter((d) => d.workout || d.exercises.length > 0);
  return { planned: planned.length, done: plan.days.filter((d) => d.done).length };
}

export default function PlansPage() {
  const navigate = useNavigate();
  const thisMonday = mondayOf(todayInput());
  const [plans, setPlans] = useState(null);
  const [form, setForm] = useState({ name: '', weekStart: thisMonday });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setPlans(await api.get('/plans'));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.weekStart) return setError('Pick the week for this plan.');
    const name = form.name.trim() || `Week of ${formatDate(mondayOf(form.weekStart))}`;

    setCreating(true);
    setError('');
    try {
      const plan = await api.post('/plans', { name, weekStart: form.weekStart });
      navigate(`/plans/${plan._id}`);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  async function handleDelete(plan) {
    if (!window.confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/plans/${plan._id}`);
      setPlans((list) => list.filter((p) => p._id !== plan._id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader title="Weekly plans" subtitle="Plan which workouts and exercises to do on each day of the week." />
      <ErrorAlert message={error} />

      <Card className="mb-6">
        <h2 className="mb-3 font-semibold text-slate-900">New plan</h2>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
          <Field label="Name" htmlFor="plan-name">
            <Input id="plan-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Strength block – week 1" maxLength={100} />
          </Field>
          <Field label="Week" htmlFor="plan-week" hint="Any day; snaps to Monday">
            <Input id="plan-week" type="date" value={form.weekStart} onChange={(e) => setForm({ ...form, weekStart: e.target.value })} />
          </Field>
          <Button type="submit" disabled={creating} className="sm:mb-5">
            {creating ? 'Creating…' : 'Create plan'}
          </Button>
        </form>
      </Card>

      {!plans ? (
        !error && <Spinner />
      ) : plans.length === 0 ? (
        <EmptyState title="No plans yet">Create your first weekly plan above.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const { planned, done } = planProgress(plan);
            const isCurrent = toDateInput(plan.weekStart) === thisMonday;
            const percent = planned ? Math.min(100, Math.round((done / planned) * 100)) : 0;
            return (
              <Card key={plan._id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/plans/${plan._id}`} className="font-semibold text-slate-900 hover:text-emerald-700">
                    {plan.name}
                  </Link>
                  {isCurrent && <Badge color="emerald">this week</Badge>}
                </div>
                <p className="text-sm text-slate-500">
                  {formatDate(plan.weekStart, { year: undefined })} – {formatDate(addDays(plan.weekStart, 6))}
                </p>
                <div className="mt-4 flex-1">
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>
                      {done} of {planned} planned days done
                    </span>
                    <span>{percent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <ButtonLink to={`/plans/${plan._id}`} variant="secondary" size="sm">
                    Open
                  </ButtonLink>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(plan)}>
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
