import { evaluateReference, type Machine } from '../lib/model';
import { costPoints, logDomain, logTicks, type CostPoint } from '../lib/costs';
import { DEFAULTS, PRESETS, REFERENCE_ID } from '../data/presets';
import { readSaved } from '../lib/saved';
import { fmt$, fmtAxis$ } from '../lib/format';

const NS = 'http://www.w3.org/2000/svg';
const BASE = import.meta.env.BASE_URL;
const $ = <T extends HTMLElement | SVGSVGElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const ISO_AGENTS = [1, 2, 5, 10, 20, 50, 100, 200, 400];

let points: CostPoint[] = [];
let selectedId = '';
let years = DEFAULTS.years;
let refPer = Infinity;
let drawnWidth = 0;

function load() {
  const saved = readSaved();
  const A = saved ? saved.A : { ...DEFAULTS };
  selectedId = saved ? saved.presetId : '';
  years = A.years;
  const ref = evaluateReference(PRESETS.find((p) => p.id === REFERENCE_ID)!, A);
  refPer = ref.lifePer;
  const machines: Machine[] = PRESETS.map((p) => ({ ...p, owned: !!p.owned }));
  // A machine edited in the calculator is plotted too; a preset is plotted from current data.
  if (saved && selectedId === 'custom') machines.push({ ...saved.M, id: 'custom', name: saved.M.name || 'Custom machine' });
  points = costPoints(machines, A, ref);

  $('cost-assume').textContent = Math.round(A.p * 100) + '% duty · ' + A.slotGB + ' GB/build · ' + A.years + ' yr · $' + A.rate.toFixed(2) + '/kWh';
  $('th-total').textContent = 'Total, ' + A.years + ' yr';
}

function visible() {
  const showOwned = $<HTMLInputElement>('show-owned').checked;
  return points.filter((p) => showOwned || !p.machine.owned);
}

function render() {
  const shown = visible();
  draw(shown);
  renderTable(shown);
  const none = shown.filter((p) => p.result.n === 0);
  $('cost-none').textContent = none.length
    ? "Not on the chart because they can't hold one agent with these settings: " + none.map((p) => p.machine.name).join('; ') + '.'
    : '';
}

function draw(shown: CostPoint[]) {
  const svg = $<SVGSVGElement>('cost-chart');
  const wrap = $('cost-chart-wrap');
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  hideTip();
  const W = Math.max(280, Math.round(wrap.clientWidth));
  const H = Math.round(Math.min(440, Math.max(300, W * 0.62)));
  drawnWidth = W;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const plotted = shown.filter((p) => p.result.n > 0);
  if (!plotted.length) return;

  const m = { l: 50, r: 14, t: 12, b: 42 };
  const [x0, x1] = logDomain(Math.min(...plotted.map((p) => p.total)), Math.max(...plotted.map((p) => p.total)));
  const ys = plotted.map((p) => p.perAgent);
  if (isFinite(refPer)) ys.push(refPer, refPer * 1.25);
  const [y0, y1] = logDomain(Math.min(...ys), Math.max(...ys));
  const lx = (v: number) => Math.log10(v);
  const X = (v: number) => m.l + (lx(v) - lx(x0)) / (lx(x1) - lx(x0)) * (W - m.l - m.r);
  const Y = (v: number) => H - m.b - (lx(v) - lx(y0)) / (lx(y1) - lx(y0)) * (H - m.t - m.b);
  const mk = (tag: string, attrs: Record<string, string | number>, text?: string, parent: Element = svg) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, String(attrs[k]));
    if (text != null) el.textContent = text;
    parent.appendChild(el);
    return el;
  };
  const plotL = m.l, plotR = W - m.r, plotT = m.t, plotB = H - m.b;

  // Verdict bands: below the reference per-agent cost beats the 128 GB desktop; up to 1.25× is a close call.
  if (isFinite(refPer)) {
    const yRef = Math.min(plotB, Math.max(plotT, Y(refPer)));
    const yWarn = Math.min(plotB, Math.max(plotT, Y(refPer * 1.25)));
    mk('rect', { x: plotL, y: yWarn, width: plotR - plotL, height: yRef - yWarn, fill: 'var(--warn-bg)' });
    mk('rect', { x: plotL, y: yRef, width: plotR - plotL, height: plotB - yRef, fill: 'var(--ok-bg)' });
    mk('line', { x1: plotL, x2: plotR, y1: yRef, y2: yRef, stroke: 'var(--ok)', 'stroke-width': 1 });
    const refLabel = mk('text', { x: plotL + 6, y: yRef + 13, 'font-size': 10.5, fill: 'var(--muted)', class: 'halo' }, '128 GB desktop · ' + fmt$(refPer) + ' per agent') as SVGTextElement;
    if (refLabel.getComputedTextLength() > (plotR - plotL) * 0.4) refLabel.textContent = 'Desktop ' + fmt$(refPer);
  }

  // Grid and axes.
  const thin = (vals: number[], px: (v: number) => number, gap: number) => {
    const kept: number[] = [];
    vals.forEach((v) => { if (!kept.length || Math.abs(px(v) - px(kept[kept.length - 1])) >= gap) kept.push(v); });
    return kept;
  };
  thin(logTicks(x0, x1), X, 46).forEach((v) => {
    mk('line', { x1: X(v), x2: X(v), y1: plotT, y2: plotB, stroke: 'var(--line)', 'stroke-width': 1 });
    mk('text', { x: X(v), y: plotB + 15, 'font-size': 10.5, 'text-anchor': 'middle', fill: 'var(--muted)' }, fmtAxis$(v));
  });
  thin(logTicks(y0, y1), Y, 22).forEach((v) => {
    mk('line', { x1: plotL, x2: plotR, y1: Y(v), y2: Y(v), stroke: 'var(--line)', 'stroke-width': 1 });
    mk('text', { x: plotL - 6, y: Y(v) + 3.5, 'font-size': 10.5, 'text-anchor': 'end', fill: 'var(--muted)' }, fmtAxis$(v));
  });
  mk('text', { x: (plotL + plotR) / 2, y: H - 6, 'font-size': 11, 'text-anchor': 'middle', fill: 'var(--muted)', class: 'axis-title' }, 'One box over ' + years + (years === 1 ? ' year' : ' years') + ', purchase + power');
  mk('text', { x: 12, y: (plotT + plotB) / 2, 'font-size': 11, 'text-anchor': 'middle', fill: 'var(--muted)', class: 'axis-title', transform: `rotate(-90 12 ${(plotT + plotB) / 2})` }, 'Per agent');

  // Iso-agent diagonals: per agent = total ÷ n.
  const placed: { x: number; y: number }[] = [];
  ISO_AGENTS.forEach((n) => {
    const xs = Math.max(x0, n * y0), xe = Math.min(x1, n * y1);
    if (xe <= xs * 1.001) return;
    const a = { x: X(xs), y: Y(xs / n) }, b = { x: X(xe), y: Y(xe / n) };
    mk('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: 'var(--muted)', 'stroke-width': 1, 'stroke-dasharray': '3 4', opacity: 0.6 });
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 80) return;
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const px = b.x - Math.cos(ang) * 8, py = b.y - Math.sin(ang) * 8;
    if (placed.some((q) => Math.hypot(q.x - px, q.y - py) < 44)) return;
    placed.push({ x: px, y: py });
    mk('text', { x: px, y: py - 4, 'font-size': 10, 'text-anchor': 'end', fill: 'var(--muted)', class: 'halo', transform: `rotate(${ang * 180 / Math.PI} ${px} ${py})` }, n + (n === 1 ? ' agent' : ' agents'));
  });

  // Frontier: the lowest per-agent cost available at or below each total.
  const front = plotted.filter((p) => p.frontier).sort((p, q) => p.total - q.total);
  if (front.length > 1) {
    mk('polyline', { points: front.map((p) => X(p.total) + ',' + Y(p.perAgent)).join(' '), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2, opacity: 0.55, 'stroke-linejoin': 'round' });
  }

  // Points, with a 24px hit target each.
  const labels: { p: CostPoint; text: string }[] = [];
  plotted.forEach((p) => {
    const cx = X(p.total), cy = Y(p.perAgent);
    const g = mk('g', { class: 'pt', tabindex: 0, role: 'img', 'data-id': p.id, 'aria-label': describe(p) });
    mk('circle', { cx, cy, r: 12, fill: 'transparent' }, undefined, g);
    if (p.id === selectedId) mk('circle', { cx, cy, r: 9, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.5 }, undefined, g);
    mk('circle', { class: 'mark', cx, cy, r: p.machine.owned ? 4.5 : 5, fill: p.machine.owned ? 'var(--panel)' : 'var(--accent)', stroke: p.machine.owned ? 'var(--accent)' : 'var(--panel)', 'stroke-width': 2 }, undefined, g);
    const show = () => { showTip(p, cx, cy, W, H); highlight(p.id, true); };
    const hide = () => { hideTip(); highlight(p.id, false); };
    g.addEventListener('pointerenter', show);
    g.addEventListener('pointerleave', (e) => { if ((e as PointerEvent).pointerType === 'mouse') hide(); });
    g.addEventListener('focus', show);
    g.addEventListener('blur', hide);
    if (p.id === REFERENCE_ID) labels.push({ p, text: p.id === selectedId ? 'Your pick: 128 GB desktop' : '128 GB desktop' });
    else if (p.id === selectedId) labels.push({ p, text: 'Your pick' });
  });
  labels.forEach(({ p, text }) => {
    const cx = X(p.total), cy = Y(p.perAgent);
    const t = mk('text', { x: cx + 12, y: cy - 9, 'font-size': 11, 'font-weight': 600, fill: 'var(--ink)', class: 'halo', 'pointer-events': 'none' }, text) as SVGTextElement;
    // Flip to the left of the dot when the label would run past the plot.
    if (cx + 12 + t.getComputedTextLength() > plotR) { t.setAttribute('x', String(cx - 12)); t.setAttribute('text-anchor', 'end'); }
  });
}

function describe(p: CostPoint) {
  return p.machine.name + ': ' + fmt$(p.perAgent) + ' per agent, ' + p.result.n + (p.result.n === 1 ? ' agent, ' : ' agents, ')
    + fmt$(p.total) + ' over ' + years + (years === 1 ? ' year' : ' years') + (p.machine.owned ? ' (power only)' : '') + ', ' + p.verdict.label + '.';
}

function showTip(p: CostPoint, cx: number, cy: number, W: number, H: number) {
  const tip = $('cost-tip');
  tip.textContent = '';
  const add = (tag: string, cls: string, text: string) => { const el = document.createElement(tag); el.className = cls; el.textContent = text; tip.appendChild(el); return el; };
  add('strong', 'tip-v', fmt$(p.perAgent) + ' per agent');
  add('span', 'tip-s', p.result.n + (p.result.n === 1 ? ' agent · ' : ' agents · ') + fmt$(p.total) + ' over ' + years + ' yr' + (p.machine.owned ? ', power only' : ''));
  add('span', 'tip-name', p.machine.name);
  const pill = add('span', 'pill', p.verdict.label); pill.dataset.state = p.verdict.key;
  tip.hidden = false;
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  const left = cx + 16 + tw <= W ? cx + 16 : Math.max(0, cx - 16 - tw);
  tip.style.left = left + 'px';
  tip.style.top = Math.min(Math.max(0, cy - th / 2), H - th) + 'px';
}
function hideTip() { $('cost-tip').hidden = true; }

function highlight(id: string, on: boolean) {
  document.querySelectorAll(`#cost-chart .pt[data-id="${id}"], #cost-tbody tr[data-id="${id}"]`).forEach((el) => el.classList.toggle('is-hot', on));
}

function renderTable(shown: CostPoint[]) {
  const tb = $('cost-tbody'); tb.textContent = '';
  const byTotal = (p: CostPoint, q: CostPoint) => (p.result.n ? 0 : 1) - (q.result.n ? 0 : 1) || p.total - q.total;
  const groups: [string, CostPoint[]][] = [
    ['To buy', shown.filter((p) => !p.machine.owned).sort(byTotal)],
    ['Already yours · power only', shown.filter((p) => p.machine.owned).sort(byTotal)],
  ];
  groups.forEach(([title, list]) => {
    if (!list.length) return;
    const g = document.createElement('tr'); g.className = 'group';
    const gtd = document.createElement('td'); gtd.colSpan = 6; gtd.textContent = title; g.appendChild(gtd); tb.appendChild(g);
    list.forEach((p) => {
      const tr = document.createElement('tr');
      tr.dataset.id = p.id;
      if (p.id === selectedId) tr.className = 'is-selected';
      const name = document.createElement('td');
      const a = document.createElement('a');
      a.href = p.id === 'custom' ? BASE : BASE + '?preset=' + encodeURIComponent(p.id);
      a.textContent = p.machine.name;
      name.appendChild(a);
      const tags = [p.id === selectedId ? 'Your pick' : '', p.frontier ? 'Best at this budget' : ''];
      tags.forEach((t) => { if (!t) return; const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = t; name.appendChild(tag); });
      tr.appendChild(name);
      const ratio = p.result.n && isFinite(p.verdict.ratio) ? '×' + p.verdict.ratio.toFixed(2) : '—';
      [fmt$(p.total), String(p.result.n), fmt$(p.perAgent), ratio].forEach((t) => { const td = document.createElement('td'); td.className = 'n'; td.textContent = t; tr.appendChild(td); });
      const vtd = document.createElement('td'); const pill = document.createElement('span'); pill.className = 'pill'; pill.dataset.state = p.verdict.key; pill.textContent = p.verdict.label; vtd.appendChild(pill); tr.appendChild(vtd);
      tr.addEventListener('mouseenter', () => highlight(p.id, true));
      tr.addEventListener('mouseleave', () => highlight(p.id, false));
      tb.appendChild(tr);
    });
  });
}

function init() {
  load();
  $('show-owned').addEventListener('change', render);
  render();
  new ResizeObserver(() => { if (Math.round($('cost-chart-wrap').clientWidth) !== drawnWidth) draw(visible()); }).observe($('cost-chart-wrap'));
  // Coming back from the calculator through the back/forward cache: pick up its new settings.
  window.addEventListener('pageshow', (e) => { if (e.persisted) { load(); render(); } });
}
init();
