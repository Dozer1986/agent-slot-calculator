/**
 * Default part prices and RAM stick prices, editable on the Settings page and
 * kept in localStorage. Machines with a `build` breakdown (the Micro Center
 * bundles) are priced from the parts, and RAM prices set the cost of their
 * upgrade past the stock memory, so a change here reprices them everywhere.
 * Defaults are the prices in docs/market-data.md. Every access is wrapped in try/catch.
 */
export const SETTINGS_KEY = 'agent-slot-calc-settings-v1';

export const PARTS = [
  { key: 'chassis', label: 'Case', hint: 'Rosewill RSV-L4620 4U', price: 200 },
  { key: 'fans', label: 'Case fans', hint: 'ARCTIC P12 Pro PST 5-pack', price: 20 },
  { key: 'extraFans', label: 'Extra fans', hint: '2× Noctua NF-S12B redux-1200', price: 35 },
  { key: 'cooler', label: 'CPU cooler', hint: 'ARCTIC Liquid Freezer III Pro 360, for desktops', price: 70 },
  { key: 'coolerTr', label: 'CPU cooler, Threadripper', hint: 'ARCTIC Liquid Freezer WS360-SP6 (SP6/sTR5)', price: 159 },
  { key: 'coolerEpyc', label: 'CPU cooler, EPYC', hint: 'ARCTIC Liquid Freezer WS360-SP5', price: 174 },
  { key: 'coolerXeon', label: 'CPU cooler, Xeon 6', hint: 'ARCTIC Liquid Freezer WS360-4710', price: 115 },
  { key: 'psu750', label: 'PSU, 750 W', hint: 'Seasonic Focus GX-750 Gold, for desktops', price: 90 },
  { key: 'psu1000', label: 'PSU, 1000 W', hint: 'Seasonic Focus GX-1000 Gold, for workstations', price: 130 },
  { key: 'nvme', label: 'Boot drive', hint: '2 TB NVMe', price: 210 },
] as const;
export type PartKey = (typeof PARTS)[number]['key'];

export const RAM_TYPES = [
  { key: 'ddr3', label: 'DDR3' },
  { key: 'ddr4', label: 'DDR4' },
  { key: 'ddr5', label: 'DDR5' },
  { key: 'sodimm4', label: 'DDR4 SO-DIMM' },
  { key: 'sodimm5', label: 'DDR5 SO-DIMM' },
  { key: 'rdimm3', label: 'DDR3 ECC RDIMM (server)' },
  { key: 'rdimm4', label: 'DDR4 ECC RDIMM (server)' },
  { key: 'rdimm5', label: 'DDR5 ECC RDIMM (server)' },
] as const;
export type RamType = (typeof RAM_TYPES)[number]['key'];
/** Owner-requested: every type at 4–128 GB, so prices can be entered before anything uses them. */
export const RAM_SIZES = [4, 8, 16, 32, 64, 128] as const;

/**
 * Price of one stick: half of a sourced 2-stick kit, to the nearest dollar or cent. Only sourced prices have defaults.
 * DDR4 8 GB: Crucial CT2K8G4DFRA32A $153.98, newegg.com/crucial-16gb-ddr4-3200/p/N82E16820156265 (search snapshot 2026-11-01).
 * DDR4 32 GB: Crucial Pro 2×32 GB $488, Best Buy 6543930 (2026-10).
 * DDR5 16 GB: Crucial Pro CP2K16G56C46U5 $549.99, Best Buy JX8PSKC792 (search snapshot 2026-11-01).
 * DDR5 32 GB: Crucial Pro CP2K32G56C46U5 $1,029.99, Best Buy JX8PSKC79P (search snapshot 2026-11-01).
 * DDR5 64 GB: 2×64 GB $1,852, datacenterdisk.com/ram/ddr5/128gb (2026-09-22).
 */
const RAM_DEFAULTS: Partial<Record<RamType, Partial<Record<number, number>>>> = {
  ddr4: { 8: 76.99, 32: 244 },
  ddr5: { 16: 275, 32: 515, 64: 926 },
};
/** Share of the new price a used stick sells for. */
const RESALE_DEFAULT = 0.5;
/** shortcut: every bundle board is assumed to have 4 DIMM slots; add `slots` to Build when a 2-slot board shows up. */
const SLOTS = 4;

export interface Settings {
  parts: Record<PartKey, number>;
  /** ram[type][size] = price of one stick, or null when unpriced. */
  ram: Record<RamType, Record<number, number | null>>;
  /** Share of the new price used RAM sells for (0–1). */
  resale: number;
}

export interface Sticks { type: RamType; size: number; count: number }

/** What a machine is built from, priced with the current settings. */
export interface Build {
  /** CPU + board (+ memory, on workstation bundles) as sold. */
  bundle: number;
  /** Memory the bundle ships with. */
  stock?: Sticks;
  /** Sticks bought and installed alongside the stock memory; part of the price. */
  added?: Sticks;
  /** Sticks that replace the stock memory to reach the upgrade size; their cost is the machine's RAM upgrade. */
  upgrade?: Sticks;
  cooler: keyof typeof COOLER;
  psu: 750 | 1000;
}

/** Which part price each socket's cooler uses. */
const COOLER = { aio: 'cooler', str5: 'coolerTr', sp5: 'coolerEpyc', lga4710: 'coolerXeon' } as const;

const price = (v: unknown, d: number | null) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : d);

export function defaultSettings(): Settings {
  return mergeSettings({});
}

/** Fills anything missing or invalid in a saved object from the defaults; a saved null RAM price stays unpriced. */
export function mergeSettings(s: { parts?: Record<string, unknown>; ram?: Record<string, Record<string, unknown>>; resale?: unknown }): Settings {
  const parts = {} as Settings['parts'];
  for (const p of PARTS) parts[p.key] = price(s.parts?.[p.key], p.price)!;
  const ram = {} as Settings['ram'];
  for (const t of RAM_TYPES) {
    ram[t.key] = {};
    for (const size of RAM_SIZES) {
      const v = s.ram?.[t.key]?.[size];
      ram[t.key][size] = v === null ? null : price(v, RAM_DEFAULTS[t.key]?.[size] ?? null);
    }
  }
  const resale = price(s.resale, RESALE_DEFAULT)!;
  return { parts, ram, resale: resale <= 1 ? resale : RESALE_DEFAULT };
}

export function readSettings(): Settings {
  if (typeof window === 'undefined') return defaultSettings(); // tests and the build run in Node
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return mergeSettings(JSON.parse(raw) ?? {});
  } catch (e) { /* storage unavailable, or not in a browser */ }
  return defaultSettings();
}

/** Only the values that differ from the defaults, so a later change to a default still reaches this browser. */
export function changedOnly(s: Settings) {
  const d = defaultSettings();
  const parts = Object.fromEntries(Object.entries(s.parts).filter(([k, v]) => v !== d.parts[k as PartKey]));
  const ram = Object.fromEntries(Object.entries(s.ram).map(([t, sizes]) =>
    [t, Object.fromEntries(Object.entries(sizes).filter(([g, v]) => v !== d.ram[t as RamType][Number(g)]))]));
  return { parts, ram, ...(s.resale !== d.resale && { resale: s.resale }) };
}

export function writeSettings(s: Settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(changedOnly(s))); } catch (e) { /* storage unavailable */ }
}

export function clearSettings() {
  try { localStorage.removeItem(SETTINGS_KEY); } catch (e) { /* storage unavailable */ }
}

/** Whole-dollar price of a build before any RAM upgrade, or null when its added sticks have no price. */
export function buildPrice(b: Build, s: Settings): number | null {
  const p = s.parts;
  const added = b.added ? sticksCost(b.added, s) : 0;
  if (added == null) return null;
  const psu = b.psu === 1000 ? p.psu1000 : p.psu750;
  return Math.round(b.bundle + added + p.nvme + p.chassis + p.fans + p.extraFans + p[COOLER[b.cooler]] + psu);
}

/** Whole-dollar cost of the build's RAM upgrade, or null when it has none or its sticks have no price. */
export function upgradeCost(b: Build, s: Settings): number | null {
  return b.upgrade ? sticksCost(b.upgrade, s) : null;
}

/** New price of a set of sticks, or null when that stick has no price. */
const sticksCost = (k: Sticks, s: Settings) => {
  const stick = s.ram[k.type]?.[k.size];
  return stick == null ? null : Math.round(stick * k.count);
};

export interface RamPlan {
  label: string;
  /** GB installed after the plan. */
  ram: number;
  /** Net RAM spend in USD, or null when a stick it needs has no price. */
  cost: number | null;
}

/**
 * Ways to take a bundle past its stock memory: replace it with 2×64 or 4×32 GB and leave the
 * kit unused, sell it, or move it to a second box (worth what that box would pay new), or
 * keep it and fill the free slots with 64 GB sticks.
 */
export function ramPlans(b: Build, s: Settings): RamPlan[] {
  const st = b.stock, type = b.upgrade?.type;
  if (!st || !type) return [];
  const kit = sticksCost(st, s);
  const minus = (a: number | null, c: number | null) => (a == null || c == null ? null : Math.round(a - c));
  const stockLabel = `${st.count}×${st.size} GB`;
  const plans: RamPlan[] = [{ label: `As shipped, ${stockLabel}`, ram: st.size * st.count, cost: 0 }];
  for (const buy of [{ type, size: 64, count: 2 }, { type, size: 32, count: 4 }]) {
    const c = sticksCost(buy, s), name = `${buy.count}×${buy.size} GB`, gb = buy.size * buy.count;
    plans.push(
      { label: `${name} · kit unused`, ram: gb, cost: c },
      { label: `${name} · kit sold`, ram: gb, cost: minus(c, kit == null ? null : kit * s.resale) },
      { label: `${name} · kit to 2nd box`, ram: gb, cost: minus(c, kit) },
    );
  }
  const free = SLOTS - st.count;
  if (free >= 2) plans.push({ label: `Keep ${stockLabel} + 2×64 GB`, ram: st.size * st.count + 128, cost: sticksCost({ type, size: 64, count: 2 }, s) });
  return plans;
}
