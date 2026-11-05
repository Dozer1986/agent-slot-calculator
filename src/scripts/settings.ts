import { readSettings, writeSettings, clearSettings, defaultSettings, type PartKey, type RamType, type Settings } from '../lib/settings';

let S: Settings = readSettings();
const parts = [...document.querySelectorAll<HTMLInputElement>('input[data-part]')];
const rams = [...document.querySelectorAll<HTMLInputElement>('input[data-ram]')];

const resale = document.getElementById('ram-resale') as HTMLInputElement;

function fill() {
  resale.value = String(Math.round(S.resale * 100));
  for (const el of parts) el.value = String(S.parts[el.dataset.part as PartKey]);
  for (const el of rams) {
    const v = S.ram[el.dataset.ram as RamType][Number(el.dataset.size)];
    el.value = v == null ? '' : String(v);
  }
}

document.addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement;
  const v = el.value.trim() === '' ? null : Number(el.value);
  if (v != null && !(isFinite(v) && v >= 0)) return;
  if (el.dataset.part) S.parts[el.dataset.part as PartKey] = v ?? defaultSettings().parts[el.dataset.part as PartKey];
  else if (el.dataset.ram) S.ram[el.dataset.ram as RamType][Number(el.dataset.size)] = v;
  else if (el === resale) { if (v == null || v > 100) return; S.resale = v / 100; }
  else return;
  writeSettings(S);
});

document.getElementById('settings-reset')!.addEventListener('click', () => {
  clearSettings();
  S = defaultSettings();
  fill();
});

fill();
