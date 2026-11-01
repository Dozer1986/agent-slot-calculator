/**
 * The machine catalog: processor and listing data must be complete and sourced,
 * report presets must pass through unchanged, and the power estimate used for
 * market listings must stay close to the report's own figures.
 */
import { describe, expect, it } from 'vitest';
import { CATALOG, CPUS, LISTINGS, estimatePower, findCpu, resolveListing, type Cpu, type Form } from '../src/data/catalog';
import { PRESETS } from '../src/data/presets';
import { buildPrice, changedOnly, defaultSettings, mergeSettings, ramPlans } from '../src/lib/settings';

describe('processor data', () => {
  it('has unique ids and both PassMark scores with a source for every row', () => {
    expect(new Set(CPUS.map((c) => c.id)).size).toBe(CPUS.length);
    for (const c of CPUS) {
      expect(c.st, c.name).toBeGreaterThan(500);
      expect(c.mt, c.name).toBeGreaterThan(c.st);
      // PassMark's own figures, or the report's labelled estimate for chips PassMark under-rates.
      if (c.estimated) expect(c.source, c.name).toBe('docs/research-report.md');
      else expect(c.source, c.name).toMatch(/cpubenchmark\.net/);
      expect(c.seen, c.name).toMatch(/^20\d\d-\d\d/);
    }
  });
});

describe('listing data', () => {
  it('names a known processor, a positive price and a source for every listing', () => {
    expect(new Set(LISTINGS.map((l) => l.id)).size).toBe(LISTINGS.length);
    for (const l of LISTINGS) {
      expect(findCpu(l.cpu), l.id + ' cpu ' + l.cpu).toBeDefined();
      expect(l.price, l.id).toBeGreaterThan(0);
      expect(l.ram, l.id).toBeGreaterThan(0);
      expect(l.source, l.id).toMatch(/^https:\/\//);
    }
  });

  it('never collides with a report preset id', () => {
    const presetIds = new Set(PRESETS.map((p) => p.id));
    for (const l of LISTINGS) expect(presetIds.has(l.id), l.id).toBe(false);
  });
});

describe('catalog', () => {
  it('carries every report preset through unchanged', () => {
    for (const p of PRESETS) {
      const e = CATALOG.find((x) => x.machine.id === p.id)!;
      expect(e.origin).toBe('report');
      expect(e.machine).toEqual({ ...p, owned: !!p.owned });
    }
  });

  it('resolves a listing from its processor, with measured power winning over the estimate', () => {
    const cpu = CPUS.find((c) => c.vendor === 'Intel')!;
    const base = { id: 't', name: 'Test box', cpu: cpu.id, ram: 64, price: 900, condition: 'used' as const, form: 'tower' as const, source: 'https://example.com', seen: '2026-10' };
    const est = resolveListing(base)!;
    expect(est.machine).toMatchObject({ st: cpu.st, mt: cpu.mt, ram: 64, price: 900, reserve: 6 });
    expect(est.powerEstimated).toBe(true);
    const measured = resolveListing({ ...base, idleW: 20, loadW: 150 })!;
    expect(measured.machine).toMatchObject({ idle: 20, load: 150 });
    expect(measured.powerEstimated).toBe(false);
    expect(resolveListing({ ...base, cpu: 'no-such-cpu' })).toBeNull();
  });

  it('resolves a dual-socket listing as 2 CPUs with the same combined multi-thread score', () => {
    for (const l of LISTINGS.filter((x) => x.sockets === 2)) {
      const cpu = findCpu(l.cpu)!;
      const m = resolveListing(l)!.machine;
      expect(m.cpus, l.id).toBe(2);
      expect(Number.isInteger(m.mt), l.id).toBe(true);
      expect(Math.abs(m.mt * 1.8 - (cpu.mtDual ?? cpu.mt * 1.8)), l.id).toBeLessThan(1);
    }
  });
});

describe('power estimate', () => {
  // Report presets with a known processor TDP: [form, tdp, segment, report load watts].
  const cases: [string, Form, number, Cpu['segment'], number][] = [
    ['i5-8500T mini', 'mini', 35, 'desktop-T', 65],
    ['8845HS mini', 'mini', 45, 'mobile', 78],
    ['5950X desktop', 'tower', 105, 'desktop', 225],
    ['270K Plus desktop', 'tower', 125, 'desktop', 252],
    ['9950X desktop', 'tower', 170, 'desktop', 300],
    ['EPYC 7B13 server', 'server', 225, 'server', 350],
    ['Threadripper 9980X', 'workstation', 350, 'hedt', 534],
  ];
  for (const [label, form, tdpW, segment, load] of cases) {
    it(`stays within 15% of the report's load watts for ${label}`, () => {
      const cpu: Cpu = { id: 'x', name: label, vendor: 'AMD', segment, cores: null, threads: null, tdpW, st: 1, mt: 2, source: '', seen: '' };
      expect(Math.abs(estimatePower(cpu, form).load - load) / load).toBeLessThan(0.15);
    });
  }
});

describe('priced from settings', () => {
  const built = LISTINGS.filter((l) => l.build);
  const desk = built.find((l) => l.build!.upgrade?.type === 'ddr5')!;
  const ws = built.find((l) => l.form === 'workstation')!;

  it('reproduces every listed bundle price at the default settings', () => {
    expect(built.length).toBe(24);
    for (const l of built) expect(buildPrice(l.build!, defaultSettings()), l.id).toBe(l.price);
  });

  it('prices desktop bundles with their stock memory and makes 128 GB an upgrade', () => {
    const m = resolveListing(desk, defaultSettings())!.machine;
    expect(m.ram).toBe(32);
    expect([m.upGB, m.upCost]).toEqual([128, 1852]);
    expect(resolveListing(ws, defaultSettings())!.machine.upGB).toBe(0);
  });

  it('RAM prices change only the upgrade, part prices change the bundle', () => {
    const s = defaultSettings();
    s.parts.chassis += 100;
    s.ram.ddr5[64] = 500;
    const m = resolveListing(desk, s)!.machine;
    expect([m.price, m.upCost]).toEqual([desk.price + 100, 1000]);
    expect(resolveListing(ws, s)!.machine.price).toBe(ws.price + 100);
    s.ram.ddr5[64] = null;
    expect(resolveListing(desk, s)!.machine).toMatchObject({ price: desk.price + 100, upGB: 0, upCost: 0 });
  });

  it('ignores saved values that are not prices', () => {
    const s = mergeSettings({ parts: { chassis: -5, fans: 'x' }, ram: { ddr4: { 32: 100, 16: Infinity } }, resale: 5 });
    expect(s.parts.chassis).toBe(200);
    expect(s.parts.fans).toBe(20);
    expect(s.ram.ddr4[32]).toBe(100);
    expect(s.ram.ddr4[16]).toBeNull();
    expect(s.resale).toBe(0.5);
  });

  it('saves only changed values, so new defaults still apply', () => {
    const s = defaultSettings();
    s.parts.coolerEpyc = 150;
    s.ram.ddr3[8] = 12;
    const saved = changedOnly(s);
    expect(saved.parts).toEqual({ coolerEpyc: 150 });
    expect(saved.ram.ddr3).toEqual({ 8: 12 });
    expect(saved.ram.ddr5).toEqual({});
    expect(saved).not.toHaveProperty('resale');
    expect(mergeSettings(JSON.parse(JSON.stringify(saved)))).toEqual(s);
  });
});

describe('RAM plans past the stock memory', () => {
  const plans = (id: string, s = defaultSettings()) =>
    ramPlans(LISTINGS.find((l) => l.id === id)!.build!, s).map((p) => [p.label, p.ram, p.cost]);

  it('prices every path for a 2×16 GB DDR5 bundle', () => {
    // Stock kit new = 2 × $275 = $550; sold at 50% = $275 back.
    expect(plans('mk-microcenter-270k-plus')).toEqual([
      ['As shipped, 2×16 GB', 32, 0],
      ['2×64 GB · kit unused', 128, 1852],
      ['2×64 GB · kit sold', 128, 1577],
      ['2×64 GB · kit to 2nd box', 128, 1302],
      ['4×32 GB · kit unused', 128, 2060],
      ['4×32 GB · kit sold', 128, 1785],
      ['4×32 GB · kit to 2nd box', 128, 1510],
      ['Keep 2×16 GB + 2×64 GB', 160, 1852],
    ]);
  });

  it('handles a single stock stick and DDR4 with unpriced sticks', () => {
    expect(plans('mk-microcenter-7600x3d').at(-1)).toEqual(['Keep 1×16 GB + 2×64 GB', 144, 1852]);
    const ddr4 = plans('mk-microcenter-5500f');
    expect(ddr4.find((p) => p[0] === '2×64 GB · kit sold')![2]).toBeNull(); // no DDR4 64 GB price
    expect(ddr4.find((p) => p[0] === '4×32 GB · kit sold')![2]).toBe(899); // 976 − 0.5 × 153.98
    expect(ddr4.find((p) => p[0] === '4×32 GB · kit to 2nd box')![2]).toBe(822);
  });

  it('follows the resale setting and has no plans for workstation bundles', () => {
    const s = defaultSettings();
    s.resale = 0;
    expect(plans('mk-microcenter-270k-plus', s)[2][2]).toBe(1852);
    expect(ramPlans(LISTINGS.find((l) => l.build && !l.build.stock)!.build!, s)).toEqual([]);
  });

  it('prices the 160 GB build with its added sticks', () => {
    const l = LISTINGS.find((x) => x.id === 'mk-microcenter-270k-plus-160')!;
    const s = defaultSettings();
    s.ram.ddr5[64] = 500;
    expect(resolveListing(l, s)!.machine).toMatchObject({ ram: 160, price: 3107 - 2 * 426, upGB: 0 });
  });

  it('gives each workstation socket its own cooler price', () => {
    const s = defaultSettings();
    s.parts.coolerTr += 1; s.parts.coolerEpyc += 10; s.parts.coolerXeon += 100;
    for (const [id, add] of [['mk-microcenter-tr-9970x', 1], ['mk-microcenter-epyc-9175f', 10], ['mk-microcenter-xeon-658x', 100]] as const) {
      const l = LISTINGS.find((x) => x.id === id)!;
      expect(buildPrice(l.build!, s), id).toBe(l.price + add);
    }
  });
});
