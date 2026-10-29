/** Whole dollars with thousands separators; an em dash for no value. */
export const fmt$ = (v: number) => !isFinite(v) ? '—' : '$' + Math.round(v).toLocaleString('en-US');

/** Compact axis label: $300, $1k, $1.5k, $20k. */
export const fmtAxis$ = (v: number) => v >= 1000 ? '$' + Number((v / 1000).toFixed(1)) + 'k' : '$' + Math.round(v);
