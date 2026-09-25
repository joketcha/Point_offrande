/**
 * Graphiques SVG légers, sans dépendance, interactifs (survol = infobulle).
 * Règles : un seul axe Y, marques fines, légende dès 2 séries, texte en encre neutre.
 */
import { useId, useMemo, useRef, useState, type ReactNode } from 'react';

export const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)'];

function niceTicks(min: number, max: number, count = 4): number[] {
  if (!isFinite(min) || !isFinite(max)) return [0];
  if (min === max) {
    max = min + 1;
  }
  const span = max - min;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(Math.round(v / step) * step);
  return ticks;
}

export interface Series {
  name: string;
  values: (number | null)[];
  color?: string;
  dashed?: boolean;
}

interface LineProps {
  series: Series[];
  labels: string[];
  height?: number;
  yFormat?: (v: number) => string;
  yMin?: number;
  yMax?: number;
  refLine?: { value: number; label: string };
  area?: boolean;
}

export function LineChart({ series, labels, height = 200, yFormat = (v) => v.toFixed(0), yMin, yMax, refLine, area }: LineProps) {
  const W = 600;
  const H = height;
  const pad = { l: 48, r: 12, t: 12, b: 26 };
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null && isFinite(v)));
  if (refLine) all.push(refLine.value);
  const lo = yMin ?? Math.min(...all, 0);
  const hi = yMax ?? Math.max(...all, 1);
  const ticks = niceTicks(lo, hi);
  const y0 = Math.min(lo, ticks[0]);
  const y1 = Math.max(hi, ticks[ticks.length - 1]);
  const n = labels.length;
  const x = (i: number) => pad.l + (n <= 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (n - 1));
  const y = (v: number) => pad.t + (1 - (v - y0) / (y1 - y0 || 1)) * (H - pad.t - pad.b);
  const step = Math.max(1, Math.ceil(n / 8));
  const gid = useId();

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div className="chart-box" ref={box}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line className="gridline" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end">
              {yFormat(t)}
            </text>
          </g>
        ))}
        <line className="axis" x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} />
        {labels.map((l, i) =>
          i % step === 0 || i === n - 1 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle">
              {l}
            </text>
          ) : null,
        )}
        {refLine && (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={y(refLine.value)} y2={y(refLine.value)} stroke="var(--muted)" strokeDasharray="4 4" />
            <text x={W - pad.r} y={y(refLine.value) - 4} textAnchor="end">
              {refLine.label}
            </text>
          </g>
        )}
        {series.map((s, si) => {
          const color = s.color ?? SERIES[si % SERIES.length];
          const pts = s.values.map((v, i) => (v === null || !isFinite(v) ? null : [x(i), y(v)] as const));
          let d = '';
          pts.forEach((p, i) => {
            if (!p) return;
            d += `${d && pts[i - 1] ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`;
          });
          const first = pts.find(Boolean);
          const last = [...pts].reverse().find(Boolean);
          return (
            <g key={s.name}>
              {area && si === 0 && first && last && (
                <>
                  <defs>
                    <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor={color} stopOpacity="0.25" />
                      <stop offset="1" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={`${d}L${last[0]},${H - pad.b}L${first[0]},${H - pad.b}Z`} fill={`url(#${gid})`} />
                </>
              )}
              <path d={d} fill="none" stroke={color} strokeWidth={2} strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinejoin="round" />
              {n <= 24 &&
                pts.map((p, i) => (p ? <circle key={i} cx={p[0]} cy={p[1]} r={hover === i ? 5 : 3} fill={color} stroke="var(--surface)" strokeWidth={2} /> : null))}
            </g>
          );
        })}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--axis)" />}
      </svg>
      {hover !== null && (
        <div className="tip" style={{ left: `${Math.min(70, (x(hover) / W) * 100)}%`, top: 4 }}>
          <b>{labels[hover]}</b>
          {series.map((s, si) => (
            <div key={s.name}>
              <i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: s.color ?? SERIES[si % SERIES.length], marginRight: 5 }} />
              {s.name} : {s.values[hover] === null ? '—' : yFormat(s.values[hover] as number)}
            </div>
          ))}
        </div>
      )}
      {series.length > 1 && <Legend items={series.map((s, i) => ({ name: s.name, color: s.color ?? SERIES[i % SERIES.length] }))} />}
    </div>
  );
}

export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="legend">
      {items.map((it) => (
        <span key={it.name}>
          <i style={{ background: it.color }} />
          {it.name}
        </span>
      ))}
    </div>
  );
}

interface BarProps {
  items: { label: string; value: number; sub?: string; color?: string }[];
  format?: (v: number) => string;
  showCumulative?: boolean;
}

/** Barres horizontales triées (Pareto) ; le cumul est donné en texte, pas sur un 2e axe. */
export function BarList({ items, format = (v) => v.toFixed(0), showCumulative }: BarProps) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((a, i) => a + i.value, 0) || 1;
  let cum = 0;
  return (
    <div className="stack" style={{ gap: 6 }}>
      {items.map((it) => {
        cum += it.value;
        const pctCum = (cum / total) * 100;
        return (
          <div key={it.label} title={`${it.label} : ${format(it.value)}${showCumulative ? ` — cumul ${pctCum.toFixed(0)} %` : ''}`}>
            <div className="row between small">
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
              <span className="num text-2">
                {format(it.value)}
                {showCumulative && <span className="muted"> · {pctCum.toFixed(0)} %</span>}
              </span>
            </div>
            <div className="meter" style={{ height: 10 }}>
              <div style={{ width: `${(it.value / max) * 100}%`, background: it.color ?? (showCumulative && pctCum - (it.value / total) * 100 < 80 ? 'var(--s2)' : 'var(--s1)') }} />
            </div>
            {it.sub && <div className="small muted">{it.sub}</div>}
          </div>
        );
      })}
    </div>
  );
}

interface ScatterProps {
  points: { x: number; y: number; label?: string; hollow?: boolean }[];
  line?: { x: number; y: number }[];
  xLabel: string;
  yLabel: string;
  xFormat?: (v: number) => string;
  yFormat?: (v: number) => string;
  xTicks?: number[];
  yTicks?: number[];
  height?: number;
  extraLines?: { pts: { x: number; y: number }[]; color: string; name: string; dashed?: boolean }[];
}

export function ScatterChart({ points, line, xLabel, yLabel, xFormat = (v) => v.toFixed(1), yFormat = (v) => v.toFixed(1), xTicks, yTicks, height = 260, extraLines = [] }: ScatterProps) {
  const W = 600;
  const H = height;
  const pad = { l: 52, r: 14, t: 12, b: 38 };
  const [hover, setHover] = useState<number | null>(null);
  const xs = [...points.map((p) => p.x), ...(line ?? []).map((p) => p.x), ...extraLines.flatMap((l) => l.pts.map((p) => p.x))];
  const ys = [...points.map((p) => p.y), ...(line ?? []).map((p) => p.y), ...extraLines.flatMap((l) => l.pts.map((p) => p.y))];
  const xt = xTicks ?? niceTicks(Math.min(...xs), Math.max(...xs));
  const yt = yTicks ?? niceTicks(Math.min(...ys), Math.max(...ys));
  const x0 = Math.min(...xt, ...xs), x1 = Math.max(...xt, ...xs);
  const y0 = Math.min(...yt, ...ys), y1 = Math.max(...yt, ...ys);
  const X = (v: number) => pad.l + ((v - x0) / (x1 - x0 || 1)) * (W - pad.l - pad.r);
  const Y = (v: number) => pad.t + (1 - (v - y0) / (y1 - y0 || 1)) * (H - pad.t - pad.b);
  const path = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
  return (
    <div className="chart-box">
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img">
        {yt.map((t) => (
          <g key={`y${t}`}>
            <line className="gridline" x1={pad.l} x2={W - pad.r} y1={Y(t)} y2={Y(t)} />
            <text x={pad.l - 6} y={Y(t) + 4} textAnchor="end">
              {yFormat(t)}
            </text>
          </g>
        ))}
        {xt.map((t) => (
          <g key={`x${t}`}>
            <line className="gridline" x1={X(t)} x2={X(t)} y1={pad.t} y2={H - pad.b} />
            <text x={X(t)} y={H - pad.b + 14} textAnchor="middle">
              {xFormat(t)}
            </text>
          </g>
        ))}
        <text x={(W + pad.l) / 2} y={H - 4} textAnchor="middle">
          {xLabel}
        </text>
        <text x={12} y={(H - pad.b) / 2} textAnchor="middle" transform={`rotate(-90 12 ${(H - pad.b) / 2})`}>
          {yLabel}
        </text>
        {extraLines.map((l) => (
          <path key={l.name} d={path(l.pts)} fill="none" stroke={l.color} strokeWidth={2} strokeDasharray={l.dashed ? '5 4' : undefined} />
        ))}
        {line && <path d={path(line)} fill="none" stroke="var(--s2)" strokeWidth={2} />}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={X(p.x)}
            cy={Y(p.y)}
            r={hover === i ? 7 : 5}
            fill={p.hollow ? 'var(--surface)' : 'var(--s1)'}
            stroke={p.hollow ? 'var(--s1)' : 'var(--surface)'}
            strokeWidth={2}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover !== null && (
        <div className="tip" style={{ left: `${Math.min(70, (X(points[hover].x) / W) * 100)}%`, top: `${(Y(points[hover].y) / H) * 100}%` }}>
          {points[hover].label ?? `${xFormat(points[hover].x)} ; ${yFormat(points[hover].y)}`}
        </div>
      )}
      {(extraLines.length > 0 || line) && (
        <Legend items={[...(line ? [{ name: 'Ajustement', color: 'var(--s2)' }] : []), ...extraLines.map((l) => ({ name: l.name, color: l.color }))]} />
      )}
    </div>
  );
}

export function Radar({ axes, values, max = 100, compare, size = 300 }: { axes: string[]; values: number[]; max?: number; compare?: number[]; size?: number }) {
  const c = size / 2;
  const r = c - 58;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    return [c + Math.cos(a) * r * (v / max), c + Math.sin(a) * r * (v / max)];
  };
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).join(',')).join(' ');
  return (
    <svg className="chart" viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: 420, margin: '0 auto' }} role="img">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={poly(axes.map(() => max * f))} fill="none" className="gridline" stroke="var(--grid)" />
      ))}
      {axes.map((a, i) => {
        const [x, y] = pt(i, max * 1.13);
        return (
          <text key={a} x={x} y={y + 3} textAnchor={Math.abs(x - c) < 10 ? 'middle' : x > c ? 'start' : 'end'} style={{ fontSize: 9.5 }}>
            {a}
          </text>
        );
      })}
      {compare && <polygon points={poly(compare)} fill="none" stroke="var(--muted)" strokeDasharray="4 3" strokeWidth={1.5} />}
      <polygon points={poly(values)} fill="var(--s1)" fillOpacity={0.22} stroke="var(--s1)" strokeWidth={2} />
      {values.map((v, i) => {
        const [x, y] = pt(i, v);
        return <circle key={i} cx={x} cy={y} r={3} fill="var(--s1)" />;
      })}
    </svg>
  );
}

export function Sparkline({ values, color = 'var(--s1)', height = 28 }: { values: number[]; color?: string; height?: number }) {
  const d = useMemo(() => {
    if (values.length < 2) return '';
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    return values.map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * 100).toFixed(1)},${(height - 2 - ((v - lo) / (hi - lo || 1)) * (height - 4)).toFixed(1)}`).join('');
  }, [values, height]);
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Meter({ value, max = 100, color }: { value: number; max?: number; color?: string }) {
  return (
    <div className="meter">
      <div style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }} />
    </div>
  );
}

export function StatusPill({ level, children }: { level: 'good' | 'warn' | 'crit' | 'neutral'; children: ReactNode }) {
  const icon = level === 'good' ? '✓' : level === 'warn' ? '!' : level === 'crit' ? '✕' : '•';
  return (
    <span className={`pill ${level === 'neutral' ? '' : level}`}>
      <span aria-hidden>{icon}</span>
      {children}
    </span>
  );
}
