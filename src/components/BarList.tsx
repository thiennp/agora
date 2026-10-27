export interface Bar {
  label: string;
  value: number;
  color: string;
  note?: string;
}

/** Horizontal bars as plain HTML: every value is also printed as text, so the bars are only decoration. */
export function BarList({ bars, max, unit = "" }: { bars: Bar[]; max?: number; unit?: string }) {
  const top = max ?? Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="bars">
      {bars.map((b) => (
        <div className="bar-row" key={b.label}>
          <div>
            {b.label}
            {b.note ? <div className="muted small">{b.note}</div> : null}
          </div>
          <div className="bar-track" aria-hidden="true">
            <div className="bar-fill" style={{ width: `${Math.max(2, (b.value / top) * 100)}%`, background: b.color }} />
          </div>
          <strong>{b.value}{unit}</strong>
        </div>
      ))}
    </div>
  );
}
