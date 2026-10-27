import { useEffect, useState } from 'react';
import { api } from '../api/client';
import ExerciseImage from './ExerciseImage';
import Modal from './Modal';
import { Button, ErrorAlert, Field, Input, Select, Textarea } from './ui';

const EMPTY = { name: '', muscleGroup: '', equipment: '', description: '', image: '' };
const IMAGE_URL = /^https?:\/\/\S+$/i;

// Create or edit a custom exercise. Pass `exercise` to edit, omit it to create.
export default function ExerciseFormModal({ open, exercise, meta, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // Preview updates on blur so a half-typed URL doesn't trigger a request per keystroke.
  const [previewImage, setPreviewImage] = useState('');

  useEffect(() => {
    if (open) {
      const initial = exercise ? { ...EMPTY, ...exercise } : EMPTY;
      setForm(initial);
      setPreviewImage(initial.image);
      setError('');
    }
  }, [open, exercise]);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.muscleGroup || !form.equipment) {
      setError('Name, muscle group and equipment are required.');
      return;
    }
    const image = form.image.trim();
    if (image && !IMAGE_URL.test(image)) {
      setError('Image URL must start with http:// or https://');
      return;
    }

    setSaving(true);
    setError('');
    const body = {
      name: form.name.trim(),
      muscleGroup: form.muscleGroup,
      equipment: form.equipment,
      description: form.description.trim(),
      image,
    };
    try {
      const saved = exercise ? await api.put(`/exercises/${exercise._id}`, body) : await api.post('/exercises', body);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={exercise ? 'Edit exercise' : 'New custom exercise'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="exercise-form" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <form id="exercise-form" onSubmit={handleSubmit} className="space-y-4">
        <ErrorAlert message={error} />
        <Field label="Name" htmlFor="ex-name">
          <Input id="ex-name" value={form.name} onChange={update('name')} maxLength={100} autoFocus />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Muscle group" htmlFor="ex-muscle">
            <Select id="ex-muscle" value={form.muscleGroup} onChange={update('muscleGroup')}>
              <option value="">Select…</option>
              {meta.muscleGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Equipment" htmlFor="ex-equipment">
            <Select id="ex-equipment" value={form.equipment} onChange={update('equipment')}>
              <option value="">Select…</option>
              {meta.equipment.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Description" htmlFor="ex-description">
          <Textarea id="ex-description" value={form.description} onChange={update('description')} maxLength={1000} />
        </Field>
        <Field label="Image URL" htmlFor="ex-image" hint="Optional. A link to a JPG, PNG or WebP image. Without one, an icon for the muscle group is shown.">
          <Input
            id="ex-image"
            type="url"
            inputMode="url"
            placeholder="https://…"
            value={form.image}
            onChange={update('image')}
            onBlur={() => setPreviewImage(form.image.trim())}
            maxLength={500}
          />
        </Field>
        <div>
          <p className="mb-1 text-xs font-medium text-slate-500">Preview</p>
          <ExerciseImage
            size="preview"
            exercise={{ name: form.name || 'New exercise', muscleGroup: form.muscleGroup, image: IMAGE_URL.test(previewImage) ? previewImage : '' }}
          />
        </div>
      </form>
    </Modal>
  );
}
