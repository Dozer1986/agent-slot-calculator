/** Where every part sits inside the chassis, as axis-aligned boxes in mm.
 *
 *  Axes: x runs left to right as seen from the front, y is up from the chassis floor, z runs toward the front
 *  (the front face is at z = +200, the rear face at z = -200). The origin is the middle of the floor, so the
 *  model spins about its centre. `checkFit` is the clearance check; `test/build.test.ts` runs it.
 */

export type Kind = 'solid' | 'shell' | 'hollow';

export interface Box {
  id: string;
  /** Part id from `src/data/build.ts`, used for picking and highlight. */
  part: string;
  kind: Kind;
  min: [number, number, number];
  max: [number, number, number];
  /** Where the box moves to at full explode. */
  explode: [number, number, number];
}

// Chassis body. Width 428, height 133 (3U), depth 400, sheet 1.2.
export const W = 428;
export const H = 133;
export const D = 400;
const T = 1.2;
export const EARS = 482.6;

/** Interior limits a solid part must stay inside. */
export const INTERIOR = { x: [-W / 2 + T, W / 2 - T], y: [T, H - T], z: [-D / 2 + T, D / 2 - T] } as const;

// Helpers: X(mm from the left exterior), ZF(mm back from the front face), ZR(mm forward from the rear face).
const X = (l: number) => l - W / 2;
const ZF = (d: number) => D / 2 - d;
const ZR = (d: number) => -D / 2 + d;

// ATX board, rear edge against the rear sheet. Its I/O edge sits 104 mm in from the right exterior wall.
const BOARD_IO_X = X(W - 104);
const BOARD_Y = T + 6.35; // standoffs
const PCB = 1.6;
const BY = BOARD_Y + PCB; // top of the PCB
/** Board coordinates: uIo = mm from the I/O edge toward the slots; dRear = mm from the rear edge. */
const bx = (uIo: number) => BOARD_IO_X - uIo;
const bz = (dRear: number) => ZR(T) + dRear;
const SLOT_PITCH = 20.32;
/** Chassis slot k (0 nearest the I/O) centre line. Slot 0 on this board is covered by the Gen5 M.2 heatsink. */
export const slotX = (k: number) => bx(168 + SLOT_PITCH * k);
const GPU_SLOT = 1;
const NIC_SLOT = 5;
const FREE_SLOTS = [0, 3, 4, 6, 7];

// Front fan wall: three 120 mm positions, offset from the front sheet.
const FAN_WALL = 15;
const FAN_X = [-132, -12, 108];
const FAN = 25;
const RAD = 38;

const NONE: [number, number, number] = [0, 0, 0];

function box(id: string, part: string, kind: Kind, min: [number, number, number], max: [number, number, number], explode: [number, number, number] = NONE): Box {
  return { id, part, kind, min, max, explode };
}
/** A box from a centre point and a size. */
function centred(id: string, part: string, kind: Kind, c: [number, number, number], s: [number, number, number], explode: [number, number, number] = NONE): Box {
  return box(id, part, kind, [c[0] - s[0] / 2, c[1] - s[1] / 2, c[2] - s[2] / 2], [c[0] + s[0] / 2, c[1] + s[1] / 2, c[2] + s[2] / 2], explode);
}

export function layout(): Box[] {
  const b: Box[] = [];
  const up = (mm: number): [number, number, number] => [0, mm, 0];
  const back = (mm: number): [number, number, number] => [0, 0, -mm];
  const fwd = (mm: number): [number, number, number] => [0, 0, mm];

  // Chassis sheets. 'shell' parts are skipped by the overlap check; solids must not cross them anyway.
  b.push(box('floor', 'chassis', 'shell', [-W / 2, 0, -D / 2], [W / 2, T, D / 2]));
  b.push(box('wall-l', 'chassis', 'shell', [-W / 2, 0, -D / 2], [-W / 2 + T, H, D / 2]));
  b.push(box('wall-r', 'chassis', 'shell', [W / 2 - T, 0, -D / 2], [W / 2, H, D / 2]));
  b.push(box('rear', 'chassis', 'shell', [-W / 2, 0, -D / 2], [W / 2, H, -D / 2 + T]));
  b.push(box('lid', 'chassis', 'shell', [-W / 2, H - T, -D / 2], [W / 2, H, D / 2], up(110)));
  // Front: mesh door face, ears and handles. Depth 400 includes the door, not the handles.
  b.push(box('front', 'chassis', 'shell', [-W / 2, 0, D / 2 - T], [W / 2, H, D / 2], fwd(120)));
  b.push(box('ears', 'chassis', 'shell', [-EARS / 2, 0, D / 2 - 3], [EARS / 2, H, D / 2], fwd(120)));
  for (const s of [-1, 1]) b.push(box(`handle${s < 0 ? '-l' : '-r'}`, 'chassis', 'shell', [s * 228 - 12, 12, D / 2], [s * 228 + 12, H - 12, D / 2 + 45], fwd(120)));
  // Front-panel USB/switch board, in the front-right corner behind the door.
  b.push(box('front-io', 'chassis', 'solid', [X(388), 95, ZF(14)], [X(418), 128, ZF(2)], fwd(120)));
  // Rear vent fans and the PSU opening region are implied by the parts that sit in them.
  for (const k of FREE_SLOTS) b.push(box(`cover-${k}`, 'chassis', 'shell', [slotX(k) - 9, 9, -D / 2], [slotX(k) + 9, 127, -D / 2 + T], back(60)));

  // Motherboard and what is soldered to it.
  b.push(box('pcb', 'board', 'solid', [bx(305), BOARD_Y, bz(0)], [bx(0), BY, bz(244)]));
  b.push(box('io-shroud', 'board', 'solid', [bx(155), BY, bz(0)], [bx(2), 49, bz(30)]));
  b.push(box('vrm-top', 'board', 'solid', [bx(155), BY, bz(14)], [bx(36), 41, bz(65)]));
  b.push(box('vrm-right', 'board', 'solid', [bx(36), BY, bz(65)], [bx(2), 44, bz(160)]));
  b.push(centred('socket', 'board', 'solid', [bx(97), BY + 3.5, bz(121)], [52, 7, 45]));
  for (const k of [GPU_SLOT, 2, NIC_SLOT, 6]) b.push(box(`pcie-${k}`, 'board', 'solid', [slotX(k) - 3.75, BY, bz(39)], [slotX(k) + 3.75, BY + 11.4, bz(125)]));
  const dimmZ = [169, 179, 189, 199].map(bz);
  dimmZ.forEach((z, i) => b.push(box(`dimm-${i}`, 'board', 'solid', [bx(167), BY, z - 3.5], [bx(31), BY + 9, z + 3.5])));
  b.push(box('m2a-heatsink', 'board', 'hollow', [bx(179), BY, bz(27)], [bx(153), 22, bz(152)], up(90)));
  b.push(box('m2-shroud', 'board', 'solid', [bx(257), BY, bz(27)], [bx(194), 17, bz(152)]));
  b.push(box('m2-plate', 'board', 'solid', [bx(260), BY, bz(152)], [bx(194), 15, bz(224)]));
  b.push(box('atx24', 'board', 'solid', [bx(100), BY, bz(227)], [bx(51), 21, bz(240)]));
  b.push(box('eps', 'board', 'solid', [bx(15), BY, bz(44)], [bx(2), 20, bz(76)]));

  // CPU and the pump block on it.
  const cpuTop = BY + 7 + 4.4;
  b.push(centred('cpu', 'cpu', 'solid', [bx(97), BY + 7 + 2.2, bz(121)], [45, 4.4, 37.5], up(60)));
  b.push(box('pump', 'cooler', 'solid', [bx(97) - 49, cpuTop, bz(121) - 39], [bx(97) + 49, cpuTop + 55, bz(121) + 39], up(110)));

  // Memory in the second and fourth slots from the CPU. The module's lower 4 mm is inside the slot.
  for (const i of [1, 3]) b.push(box(`ram-${i}`, 'ram', 'solid', [bx(166), BY + 9, dimmZ[i] - 3.5], [bx(32.65), BY + 9 + 29, dimmZ[i] + 3.5], up(70)));

  // SSD under the Gen5 heatsink.
  b.push(box('ssd', 'ssd', 'solid', [bx(177), BY + 2, bz(60)], [bx(155), BY + 4.5, bz(140)], up(50)));

  // Cards. The card box starts above the slot connector; height is from the PCB edge less the 9.4 mm in the slot.
  const cardY = BY + 11.4;
  const gx = slotX(GPU_SLOT);
  b.push(box('gpu', 'gpu', 'solid', [gx - 38, cardY, bz(0)], [gx + 1, cardY + 111.76 - 9.4, bz(267)], up(90)));
  b.push(box('gpu-bracket', 'gpu', 'shell', [gx - 1, 9, -D / 2], [gx + 1, 129, -D / 2 + T], up(90)));
  const nx = slotX(NIC_SLOT);
  b.push(box('nic', 'nic', 'solid', [nx - 8, cardY, bz(0)], [nx + 1, cardY + 68.9 - 9.4, bz(142)], up(90)));
  b.push(box('nic-bracket', 'nic', 'shell', [nx - 1, 9, -D / 2], [nx + 1, 129, -D / 2 + T], up(90)));

  // PSU on end in the rear-right corner, modular face toward the front.
  b.push(box('psu', 'psu', 'solid', [X(348), T, ZR(T)], [X(348 + 63.5), T + 125, ZR(T + 100)], [60, 0, -90]));

  // Rear 60 mm fans on the vent above the I/O opening.
  for (const [i, cx] of [2, 68].entries()) b.push(centred(`rear-fan-${i}`, 'fans-rear', 'solid', [cx, 94, ZR(T + 12.5)], [60, 60, 25], back(90)));

  // Front wall: push fans, radiator, pull fans.
  FAN_X.forEach((cx, i) => b.push(centred(`push-${i}`, 'fans-push', 'solid', [cx, 66, ZF(FAN_WALL + FAN / 2)], [120, 120, FAN], fwd(150))));
  b.push(centred('radiator', 'radiator', 'solid', [FAN_X[1], 66, ZF(FAN_WALL + FAN + RAD / 2)], [398, 120, RAD], fwd(100)));
  FAN_X.forEach((cx, i) => b.push(centred(`pull-${i}`, 'fans-pull', 'solid', [cx, 66, ZF(FAN_WALL + FAN + RAD + FAN / 2)], [120, 120, FAN], fwd(50))));

  return b;
}

export interface Fit {
  /** Pairs of solid boxes from different parts that share volume. */
  overlaps: [string, string][];
  /** Solid boxes that poke outside the chassis interior. */
  outside: string[];
  /** Named gaps in mm. */
  gaps: { label: string; mm: number }[];
}

const overlap1 = (a0: number, a1: number, b0: number, b1: number) => Math.min(a1, b1) - Math.max(a0, b0) > 0.01;

export function checkFit(boxes: Box[]): Fit {
  const solids = boxes.filter((b) => b.kind === 'solid');
  const overlaps: [string, string][] = [];
  for (let i = 0; i < solids.length; i++) {
    for (let j = i + 1; j < solids.length; j++) {
      const a = solids[i], b = solids[j];
      if (a.part === b.part) continue;
      if ([0, 1, 2].every((k) => overlap1(a.min[k], a.max[k], b.min[k], b.max[k]))) overlaps.push([a.id, b.id]);
    }
  }
  const lim = [INTERIOR.x, INTERIOR.y, INTERIOR.z];
  const outside = solids.filter((b) => [0, 1, 2].some((k) => b.min[k] < lim[k][0] - 0.01 || b.max[k] > lim[k][1] + 0.01)).map((b) => b.id);
  const by = (id: string) => boxes.find((b) => b.id === id)!;
  const gpu = by('gpu'), pull = by('pull-0'), rad = by('radiator'), pump = by('pump');
  const gaps = [
    { label: 'GPU end to the pull fans', mm: pull.min[2] - gpu.max[2] },
    { label: 'Longest card that clears the pull fans', mm: pull.min[2] - gpu.min[2] },
    { label: 'GPU top to the lid', mm: INTERIOR.y[1] - gpu.max[1] },
    { label: 'Pump block top to the lid', mm: INTERIOR.y[1] - pump.max[1] },
    { label: 'Radiator end to the left wall', mm: rad.min[0] - INTERIOR.x[0] },
    { label: 'Radiator end to the right wall', mm: INTERIOR.x[1] - rad.max[0] },
  ].map((g) => ({ ...g, mm: Math.round(g.mm * 10) / 10 }));
  return { overlaps, outside, gaps };
}
