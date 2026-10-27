import { useState } from 'react';
import { Card } from './ui';

// Chart theme shared by all charts: recessive grid and axes, ink-colored text.
export const CHART_COLORS = {
  weight: '#059669', // emerald-600
  volume: '#0284c7', // sky-600
  grid: '#e2e8f0',
  axis: '#64748b',
};

export const AXIS_PROPS = {
  tick: { fill: CHART_COLORS.axis, fontSize: 12 },
  axisLine: false,
  tickLine: false,
};

export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-medium text-slate-900">{labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-2 text-slate-600">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
          {entry.name}: <span className="font-medium text-slate-900">{valueFormatter ? valueFormatter(entry.value) : entry.value}</span>
        </p>
      ))}
    </div>
  );
}

// A chart with a title and a toggle to show the same data as a table.
export default function ChartCard({ title, subtitle, rows, columns, children, emptyMessage = 'No data yet.' }) {
  const [showTable, setShowTable] = useState(false);
  const empty = !rows || rows.length === 0;

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {!empty && (
          <button type="button" className="shrink-0 text-xs font-medium text-emerald-700 hover:underline" onClick={() => setShowTable((s) => !s)}>
            {showTable ? 'Show chart' : 'Show table'}
          </button>
        )}
      </div>

      {empty ? (
        <p className="flex h-64 items-center justify-center text-sm text-slate-500">{emptyMessage}</p>
      ) : showTable ? (
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                {columns.map((c) => (
                  <th key={c.key} className={`pb-2 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key} className={`py-1.5 ${c.align === 'right' ? 'text-right' : ''}`}>
                      {c.format ? c.format(row[c.key], row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-64">{children}</div>
      )}
    </Card>
  );
}
