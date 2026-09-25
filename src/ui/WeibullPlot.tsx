import type { WeibullFit } from '../engine/stats';
import { ScatterChart } from './Charts';

const F_TICKS = [0.01, 0.05, 0.1, 0.2, 0.4, 0.632, 0.9, 0.99];
const yOf = (F: number) => Math.log(-Math.log(1 - F));
const Fof = (y: number) => 1 - Math.exp(-Math.exp(y));

/** Papier de Weibull : x = ln t, y = ln(−ln(1−F)), axes gradués en unités réelles. */
export function WeibullPlot({ fit, showLine = true, height = 280 }: { fit: WeibullFit; showLine?: boolean; height?: number }) {
  const pts = fit.points;
  const tMin = Math.min(...pts.map((p) => p.t)) * 0.6;
  const tMax = Math.max(...pts.map((p) => p.t)) * 1.8;
  const tTicks = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000].filter((t) => t >= tMin * 0.8 && t <= tMax * 1.25);
  const lineX = [Math.log(tMin), Math.log(tMax)];
  const line = lineX.map((x) => ({ x, y: fit.beta * (x - Math.log(fit.eta)) }));
  const yMin = Math.min(yOf(0.01), ...pts.map((p) => p.y));
  const yMax = Math.max(yOf(0.99), ...pts.map((p) => p.y));
  return (
    <ScatterChart
      height={height}
      points={pts.map((p) => ({ x: p.x, y: p.y, label: `t = ${Math.round(p.t)} h · F = ${(p.F * 100).toFixed(1)} % (rang ${p.rank.toFixed(2)})` }))}
      line={showLine ? line : undefined}
      extraLines={[{ name: 'F = 63,2 % (t = η)', color: 'var(--muted)', dashed: true, pts: [{ x: lineX[0], y: 0 }, { x: lineX[1], y: 0 }] }]}
      xTicks={tTicks.map(Math.log)}
      yTicks={F_TICKS.map(yOf).filter((y) => y >= yMin - 0.1 && y <= yMax + 0.1)}
      xFormat={(v) => `${Math.round(Math.exp(v))}`}
      yFormat={(v) => `${(Fof(v) * 100).toFixed(Fof(v) < 0.1 ? 0 : Fof(v) > 0.6 && Fof(v) < 0.7 ? 1 : 0)} %`}
      xLabel="Temps de fonctionnement t (h, échelle log)"
      yLabel="F(t) — probabilité de défaillance"
    />
  );
}
