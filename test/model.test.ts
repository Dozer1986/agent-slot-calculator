/**
 * Parity tests: the TypeScript model must reproduce the prototype's numbers.
 * Expected values in test-vectors.json were generated from the MODEL block of
 * prototype/agent-slot-calculator.html. Do not regenerate them to make a failing
 * test pass; fix the port instead.
 */
import { describe, expect, it } from 'vitest';
import { evaluate, evaluateReference, judge, type Assumptions, type Machine } from '../src/lib/model';
import { DEFAULTS, PRESETS, REFERENCE_ID } from '../src/data/presets';
import vectors from './test-vectors.json';

const r2 = (x: number) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
const refMachine = PRESETS.find((p) => p.id === REFERENCE_ID)!;

describe('defaults', () => {
  it('match the prototype', () => {
    expect(DEFAULTS).toEqual(vectors.defaults);
  });
});

describe('model parity with the prototype', () => {
  for (const c of vectors.cases) {
    it(c.label, () => {
      const base = PRESETS.find((p) => p.id === c.machineId)!;
      const machine: Machine = { ...base, owned: c.overrides.owned };
      const a = c.assumptions as Assumptions;
      const r = evaluate(machine, a, c.overrides.ramOverride, c.overrides.priceOverride);
      const v = judge(r, evaluateReference(refMachine, a), machine);
      expect({
        n: r.n, limit: r.limit, pEff: r2(r.pEff), q95: r.q95, q99: r.q99,
        hwPer: r2(r.hwPer), lifePer: r2(r.lifePer), powerYr: r2(r.powerYr),
        verdictKey: v.key, verdictLabel: v.label, ratio: r2(v.ratio),
      }).toEqual(c.expected);
    });
  }
});
