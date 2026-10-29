/**
 * Data for the cost chart: what one box costs over its life against what each
 * agent slot on it costs. Pure functions over the model, no DOM.
 */
import { evaluate, judge, type Assumptions, type Machine, type Result, type Verdict } from './model';

export interface CostPoint {
  id: string;
  machine: Machine;
  result: Result;
  verdict: Verdict;
  /** One box over its life: purchase (0 when owned) plus `years` of power. */
  total: number;
  /** Lifetime cost per agent, total ÷ agents. Infinity when the box holds none. */
  perAgent: number;
  /** No cheaper purchase gives a lower cost per agent. Owned machines never qualify. */
  frontier: boolean;
}

export function costPoints(machines: Machine[], a: Assumptions, ref: Result): CostPoint[] {
  const points: CostPoint[] = machines.map((m) => {
    const r = evaluate(m, a);
    return { id: m.id || 'custom', machine: m, result: r, verdict: judge(r, ref, m), total: r.cost + a.years * r.powerYr, perAgent: r.lifePer, frontier: false };
  });
  let best = Infinity;
  points
    .filter((p) => !p.machine.owned && p.result.n > 0)
    .sort((x, y) => x.total - y.total || x.perAgent - y.perAgent)
    .forEach((p) => { if (p.perAgent < best) { p.frontier = true; best = p.perAgent; } });
  return points;
}

/** Log-scale domain padded by a quarter on each side and snapped outward to 1-2-3-5 steps. */
export function logDomain(lo: number, hi: number): [number, number] {
  const down = (v: number) => { const e = 10 ** Math.floor(Math.log10(v)); return [5, 3, 2, 1].map((s) => s * e).find((t) => t <= v)!; };
  const up = (v: number) => { const e = 10 ** Math.floor(Math.log10(v)); return [1, 2, 3, 5, 10].map((s) => s * e).find((t) => t >= v)!; };
  return [down(lo / 1.25), up(hi * 1.25)];
}

/** Candidate ticks at 1, 2, 3 and 5 times each power of ten inside the domain. */
export function logTicks(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) {
    for (const s of [1, 2, 3, 5]) { const v = s * 10 ** e; if (v >= lo * 0.999 && v <= hi * 1.001) out.push(v); }
  }
  return out;
}
