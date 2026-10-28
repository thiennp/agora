import type { CityMapData } from "@/app/_composition/reports";

/** Districts of the synthetic sandbox city as bubbles sized by how many simulated families live there. The list below carries the same numbers. */
export function CityMap({ data }: { data: CityMapData }) {
  const W = 640, H = 340, pad = 56;
  const lats = data.districts.map((d) => d.lat), lngs = data.districts.map((d) => d.lng);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const x = (lng: number) => pad + ((lng - minLng) / Math.max(maxLng - minLng, 0.01)) * (W - pad * 2);
  const y = (lat: number) => H - pad - ((lat - minLat) / Math.max(maxLat - minLat, 0.01)) * (H - pad * 2);
  const top = Math.max(...data.districts.map((d) => d.count), 1);
  return (
    <figure style={{ margin: 0 }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Map of ${data.districts.length} districts in the synthetic sandbox city`}>
        {data.districts.map((d) => {
          const r = 8 + (d.count / top) * 12;
          return (
            <g key={d.name}>
              <circle cx={x(d.lng)} cy={y(d.lat)} r={r} fill="var(--accent)" opacity="0.28" stroke="var(--accent)" />
              <text x={x(d.lng)} y={y(d.lat) + 4} textAnchor="middle" style={{ fill: "var(--text)", fontWeight: 600 }}>{d.count}</text>
              <text x={x(d.lng)} y={y(d.lat) + r + 14} textAnchor="middle">{d.name}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="muted small">
        {data.label} {data.families} families in {data.districts.length} districts. Positions are on a made-up grid, not a real map.
        <details style={{ marginTop: 6 }}>
          <summary>Show the numbers</summary>
          <ul>{data.districts.map((d) => <li key={d.name}>{d.name}: {d.count}</li>)}</ul>
        </details>
      </figcaption>
    </figure>
  );
}
