import { useState } from 'react';

// Simple line icons (24×24, stroked) used when an exercise has no image or it fails to load.
const ICON_PATHS = {
  chest: ['M4 7.5c2.5-2 6-1.5 8 1 2-2.5 5.5-3 8-1V13c-2.5 3-6 3-8 .5-2 2.5-5.5 2.5-8-.5z', 'M12 8.5v5'],
  back: ['M5 4.5h14l-3 15H8z', 'M12 4.5v15', 'M8.5 9.5 12 12l3.5-2.5'],
  legs: ['M8 3h8', 'M8 3v8l-2 10', 'M16 3v8l2 10', 'M12 3v4'],
  shoulders: ['M3.5 17a8.5 7 0 0 1 17 0', 'M12 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
  arms: ['M4 19v-3c0-4 2.5-6.5 6-6.5h1.5L14 5h3l-1 5.5c2.5 1 4 3 4 5.5v3z', 'M10 13.5c1.5 1 3.5 1 5 0'],
  core: ['M7 4h10v13a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3z', 'M12 4v16', 'M7 9h10', 'M7 14h10'],
  'full body': ['M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M12 7v7', 'M6 10h12', 'M12 14l-4 7', 'M12 14l4 7'],
  cardio: ['M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z', 'M7.5 12h2.5l1-2 2 4 1-2h2.5'],
  default: ['M3 10v4', 'M21 10v4', 'M6 7v10', 'M18 7v10', 'M6 12h12'],
};

const TINTS = {
  chest: 'bg-rose-50 text-rose-500',
  back: 'bg-sky-50 text-sky-600',
  legs: 'bg-amber-50 text-amber-600',
  shoulders: 'bg-violet-50 text-violet-500',
  arms: 'bg-emerald-50 text-emerald-600',
  core: 'bg-orange-50 text-orange-500',
  'full body': 'bg-teal-50 text-teal-600',
  cardio: 'bg-red-50 text-red-500',
  default: 'bg-slate-100 text-slate-500',
};

const SIZES = {
  xs: { box: 'h-10 w-10 shrink-0 rounded-md', icon: 'h-5 w-5' },
  sm: { box: 'h-12 w-12 shrink-0 rounded-lg', icon: 'h-6 w-6' },
  preview: { box: 'h-32 w-48 rounded-lg', icon: 'h-10 w-10' },
  banner: { box: 'h-40 w-full', icon: 'h-12 w-12' },
  lg: { box: 'aspect-[3/2] w-full rounded-xl', icon: 'h-16 w-16' },
};

export function MuscleGroupIcon({ group, className = '' }) {
  const paths = ICON_PATHS[group] || ICON_PATHS.default;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

// Shows the exercise image, or a muscle-group placeholder when there is none or it fails to load.
export default function ExerciseImage({ exercise, size = 'sm', className = '' }) {
  const src = exercise?.image || '';
  const [failedSrc, setFailedSrc] = useState(null);
  const { box, icon } = SIZES[size] || SIZES.sm;
  const name = exercise?.name || 'Exercise';

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
        className={`${box} bg-slate-100 object-cover ${className}`}
      />
    );
  }

  const group = exercise?.muscleGroup;
  return (
    <div
      role="img"
      aria-label={`${name}${group ? ` (${group})` : ''}, no image`}
      className={`${box} flex flex-col items-center justify-center gap-1 ${TINTS[group] || TINTS.default} ${className}`}
    >
      <MuscleGroupIcon group={group} className={icon} />
      {(size === 'banner' || size === 'lg') && group && <span className="text-xs font-medium capitalize opacity-80">{group}</span>}
    </div>
  );
}
