/**
 * The cost chart's data: totals, the per-agent identity the diagonals rely on,
 * the best-at-this-budget frontier, and the log-axis helpers.
 */
import { describe, expect, it } from 'vitest';
import { evaluateReference, type Machine } from '../src/lib/model';
import { costPoints, logDomain, logTicks } from '../src/lib/costs';
import { DEFAULTS, PRESETS, REFERENCE_ID } from '../src/data/presets';

const ref = evaluateReference(PRESETS.find((p) => p.id === REFERENCE_ID)!, DEFAULTS);
const machines: Machine[] = PRESETS.map((p) => ({ ...p, owned: !!p.owned }));
const points = costPoints(machines, DEFAULTS, ref);
const byId = (id: string) => points.find((p) => p.id === id)!;

describe('cost points', () => {
  it('total is purchase plus years of power, and per agent is total ÷ agents', () => {
    for (const p of points) {
      expect(p.total).toBeCloseTo(p.result.cost + DEFAULTS.years * p.result.powerYr, 9);
      if (p.result.n > 0) expect(p.perAgent).toBeCloseTo(p.total / p.result.n, 9);
      else expect(p.perAgent).toBe(Infinity);
    }
  });

  it('matches the calculator for the reference box', () => {
    expect(Math.round(byId(REFERENCE_ID).total)).toBe(4272);
    expect(Math.round(byId(REFERENCE_ID).perAgent)).toBe(305);
  });

  it('counts power only for owned machines', () => {
    expect(byId('mbp').result.cost).toBe(0);
    expect(byId('mbp').total).toBeCloseTo(DEFAULTS.years * byId('mbp').result.powerYr, 9);
  });

  it('marks the purchases nothing cheaper beats per agent, and never owned or empty boxes', () => {
    const frontier = points.filter((p) => p.frontier).map((p) => p.id);
    expect(frontier).toEqual(['m720q', 'ser8', '5950x', '270k128']);
    const buyable = points.filter((p) => !p.machine.owned && p.result.n > 0);
    for (const p of points.filter((q) => q.frontier)) {
      expect(buyable.some((q) => q.total < p.total && q.perAgent <= p.perAgent)).toBe(false);
    }
  });
});

describe('log axis helpers', () => {
  it('pads the domain and snaps outward to 1-2-3-5 steps', () => {
    expect(logDomain(436, 17156)).toEqual([300, 30000]);
    expect(logDomain(305, 1548)).toEqual([200, 2000]);
  });

  it('lists ticks inside the domain only', () => {
    expect(logTicks(300, 3000)).toEqual([300, 500, 1000, 2000, 3000]);
  });
});
