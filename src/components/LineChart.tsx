export interface Series {
  key: string;
  label: string;
  /** A CSS color, normally a variable such as var(--c-learning). */
  color: string;
  values: (number | null)[];
  dashed?: boolean;
  /** Optional range (for example min to max over seeds), drawn as a soft band. */
  band?: { min: (number | null)[]; max: (number | null)[] };
}

const W = 640;
const H = 300;
const M = { l: 44, r: 16, t: 14, b: 40 };

/**
 * A plain SVG line chart: no chart library, drawn from the numbers it is given. Lines differ by dash as well as color, the legend
 * names every line, and the same numbers are available as a table for anyone who cannot read the picture.
 */
export function LineChart({ title, summary, xs, series, yMax, yTicks = 5, format = (n: number) => String(n), xLabel = "Round", markAfter }: {
  title: string;
  summary: string;
  xs: number[];
  series: Series[];
  yMax: number;
  yTicks?: number;
  format?: (n: number) => string;
  xLabel?: string;
  /** Draw a vertical marker after this x value (for example the round where preferences change). */
  markAfter?: { x: number; label: string };
}) {
  const id = title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const x = (v: number) => M.l + ((v - xs[0]!) / Math.max(xs.at(-1)! - xs[0]!, 1)) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - (Math.min(v, yMax) / yMax) * (H - M.t - M.b);
  const path = (vals: (number | null)[]) => vals.map((v, i) => (v === null ? null : `${i === 0 || vals[i - 1] === null ? "M" : "L"}${x(xs[i]!).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean).join(" ");
  const band = (b: NonNullable<Series["band"]>) => {
    const up = b.max.map((v, i) => (v === null ? null : `${x(xs[i]!).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean);
    const down = b.min.map((v, i) => (v === null ? null : `${x(xs[i]!).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean).reverse();
    return `M${[...up, ...down].join(" L")} Z`;
  };
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (yMax / yTicks) * i);

  return (
    <figure style={{ margin: 0 }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t ${id}-d`}>
        <title id={`${id}-t`}>{title}</title>
        <desc id={`${id}-d`}>{summary}</desc>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} />
            <text x={M.l - 8} y={y(t) + 4} textAnchor="end">{format(t)}</text>
          </g>
        ))}
        <line className="axis" x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} />
        {xs.map((v) => (
          <text key={v} x={x(v)} y={H - M.b + 18} textAnchor="middle">{v}</text>
        ))}
        <text x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle">{xLabel}</text>
        {markAfter ? (
          <g>
            <line x1={x(markAfter.x + 0.5)} x2={x(markAfter.x + 0.5)} y1={M.t} y2={H - M.b} stroke="var(--muted)" strokeDasharray="2 4" />
            <text x={x(markAfter.x + 0.5) + 4} y={M.t + 10}>{markAfter.label}</text>
          </g>
        ) : null}
        {series.map((s) => (s.band ? <path key={`${s.key}-band`} d={band(s.band)} fill={s.color} opacity={0.14} /> : null))}
        {series.map((s) => (
          <g key={s.key}>
            <path d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2.5} strokeDasharray={s.dashed ? "6 5" : undefined} strokeLinejoin="round" strokeLinecap="round" />
            {s.values.map((v, i) => (v === null ? null : <circle key={i} cx={x(xs[i]!)} cy={y(v)} r={3} fill={s.color} />))}
          </g>
        ))}
      </svg>
      <div className="legend" aria-hidden="true">
        {series.map((s) => (
          <span key={s.key}>
            <span className="sw" style={{ borderTopColor: s.color, borderTopStyle: s.dashed ? "dashed" : "solid" }} />
            {s.label}
          </span>
        ))}
      </div>
      <details>
        <summary>Show the numbers</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{xLabel}</th>
                {series.map((s) => <th key={s.key} className="num">{s.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {xs.map((v, i) => (
                <tr key={v}>
                  <td>{v}</td>
                  {series.map((s) => <td key={s.key} className="num">{s.values[i] === null || s.values[i] === undefined ? "–" : format(s.values[i]!)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
