import { useEffect, useState } from 'react';
import { api, qs } from '../api/client';
import useDebounce from '../hooks/useDebounce';
import ExerciseImage from './ExerciseImage';
import Modal from './Modal';
import { Badge, ErrorAlert, Input, Select, Spinner } from './ui';

// Modal for choosing an exercise from the library. Calls onSelect(exercise) for the clicked one.
export default function ExercisePicker({ open, onClose, onSelect, excludeIds = [] }) {
  const [search, setSearch] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    if (open && muscleGroups.length === 0) {
      api.get('/exercises/meta').then((meta) => setMuscleGroups(meta.muscleGroups)).catch(() => {});
    }
  }, [open, muscleGroups.length]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .get(`/exercises${qs({ search: debouncedSearch, muscleGroup })}`)
      .then((data) => !cancelled && setExercises(data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, debouncedSearch, muscleGroup]);

  const visible = exercises.filter((e) => !excludeIds.includes(e._id));

  return (
    <Modal open={open} onClose={onClose} title="Add exercise" wide>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Search exercises…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
        <Select value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value)} className="sm:w-48">
          <option value="">All muscle groups</option>
          {muscleGroups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
      </div>

      <ErrorAlert message={error} />
      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No exercises found.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {visible.map((exercise) => (
            <li key={exercise._id}>
              <button
                type="button"
                onClick={() => onSelect(exercise)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-emerald-50"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <ExerciseImage exercise={exercise} size="xs" />
                  <span className="truncate font-medium text-slate-800">{exercise.name}</span>
                </span>
                <span className="flex shrink-0 gap-1">
                  <Badge color="emerald">{exercise.muscleGroup}</Badge>
                  <Badge>{exercise.equipment}</Badge>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
