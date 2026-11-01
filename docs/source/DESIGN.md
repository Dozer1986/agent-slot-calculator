# Agent Slot Calculator: design spec

The prototype's CSS is the source of truth. This file collects the decisions behind it, so the port keeps them.

## Direction

The look is an equipment spec sheet: cool blue-grey neutrals, one cobalt accent, a condensed display face for big numbers, and a mono face for every figure.

It's a tool, so it's scanned and operated rather than read top to bottom. The answer (verdict, agent count, cost per agent) sits next to the inputs on desktop and stays pinned in a bar on phones.

## Color tokens

Every color comes from a token. Light values sit on bare `:root`. The dark values are defined twice, under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` and under `:root[data-theme="dark"]`, and both carry `color-scheme: dark`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F1F3F7` | `#0D1219` | Page ground |
| `--panel` | `#FFFFFF` | `#141B25` | Panels, phone bar, metric cells |
| `--panel-2` | `#F6F7FA` | `#18202C` | Inputs, neutral verdict band, table header, upgrade box |
| `--ink` | `#121925` | `#E6EBF2` | Text, CPU line on the chart |
| `--muted` | `#576274` | `#96A2B3` | Hints, labels, secondary text |
| `--line` | `#D7DCE4` | `#263041` | Borders, chart baseline |
| `--track` | `#E2E6ED` | `#232D3C` | Reserved for slider tracks |
| `--accent` | `#2A52C4` | `#8DA8FF` | Sliders, selected chip, chart bars, focus ring |
| `--accent-ink` | `#FFFFFF` | `#0D1219` | Text on accent |
| `--accent-weak` | `#E3E9FA` | `#1B2645` | Row hover/selected, reset hover |
| `--ok` / `--ok-bg` | `#1C7046` / `#E0F1E7` | `#5ACB8C` / `#11301F` | "Worth it", "Use it" |
| `--warn` / `--warn-bg` | `#8C5400` / `#FAEDD4` | `#F0B259` / `#33250E` | "Close call", "Cheap but slow" |
| `--bad` / `--bad-bg` | `#AE251D` / `#FAE2DF` | `#FF8B80` / `#3A1613` | "Skip", "Can't hold an agent", memory line on the chart |

The semantic colors (ok, warn, bad) are separate from the accent; don't use the accent to mean "good".

## Type

| Token | Family | Used for |
|---|---|---|
| `--font-display` | Archivo (variable width) | H1 at `font-stretch: 112%`, weight 780; H2 at 100%, weight 720; the big agent count at **72%**, weight 800, 68px |
| `--font-body` | IBM Plex Sans | Everything else; body 15px/1.5 |
| `--font-mono` | IBM Plex Mono | Number inputs, metric values, table numbers, chart labels, all with `tabular-nums` |

Eyebrow labels are 11px, weight 600, uppercase, letter-spacing 0.08em, in `--muted`. Headings use `text-wrap: balance`.

## Layout

- **Wrapper:** full width, with no max-width (owner request 2026-11-01). Side gutters use `max(16px, env(safe-area-inset-left/right))`, vertical padding is `padding-block: 28px 40px`.
- **Grid areas:** `machine`, `result`, `workload`, `table`, `how`.
  - **Below 920px:** one column in the order machine, result, workload, table, how, plus the fixed phone bar. The wrapper's bottom padding grows by `96px + safe-area-inset-bottom` so the bar never covers content.
  - **920px and up:** two columns (`1.08fr` / `0.92fr`). The result panel spans the machine and workload rows and is `position: sticky` at `top: safe-area-inset-top + 16px`. The table and how-it-works span both columns.
- **Field pairs:** two columns from 560px up, one column below.
- **Panels:** 1px `--line` border, 10px radius, 18px padding, internal `gap: 16px`. There are no shadows except a soft one on the phone bar.

## Components

- **Slider field:** the label sits on the left and a mono number input on the right (with an optional `$` prefix or unit suffix), with a full-width range input under them (`accent-color: var(--accent)`) and a hint line in 12.5px `--muted`. Memory per build adds a segmented chip row.
- **Segmented control:** buttons with `aria-pressed`; the pressed button is filled with the accent.
- **Verdict band:** `--panel-2` by default, then `--ok-bg`, `--warn-bg` or `--bad-bg` by `data-state`. It holds the pill and the machine name.
- **Pill:** outlined in `currentColor` with a 7px dot. Its color comes from `data-state`. The same component appears in the table and the phone bar.
- **Metrics:** a 2×2 grid separated by 1px lines, drawn as a `--line` background behind `--panel` cells. Each cell has an eyebrow, a 19px mono value and a 12px sub-line.
- **Flags:** a list with a 7px square marker colored by `data-state`.
- **Table:** `min-width: 620px` inside an `overflow-x: auto` container.
  - The header is sticky, uppercase 11px, on `--panel-2`.
  - Number columns are right-aligned mono.
  - Group rows are uppercase 11px on `--panel-2` and aren't clickable.
  - The selected row gets `--accent-weak` plus a 3px inset accent bar on its first cell.

## Chart (verdict panel)

The chart is an SVG with `viewBox 0 0 320 132` at 100% width.

- **Scale:** the plot runs x from 10 to 310 and the baseline sits at y = 102. The x domain is 0 to `xMax`, where `xMax = min(max(n, ceil(min(max(ramFit, cpuFit), 2n + 2))), 60)`, and each k gets a slot of `(300) / (xMax + 1)`.
- **Bars:** one per k, height proportional to the probability of k builds running at once with n agents.
  - Bars up to the 99th percentile are filled with the accent; bars beyond it with `--muted`.
  - Bars up to the 95th percentile are drawn at 0.95 opacity, the rest at 0.55.
- **Capacity lines:** two vertical lines at the right edge of the last build that fits.
  - "Memory fits X" is dashed in `--bad`, labeled at y = 10.
  - "CPU fits X" is dotted in `--ink`, labeled at y = 20.
  - A label flips to `text-anchor: end` past 62% of the width, and gets ` →` when its value runs off the scale.
- **Ticks and labels:** ticks at 0, `xMax` and the 99th percentile. The 99th-percentile label is in the accent, with the caption "99% of the time ≤ k" below it.
- **Text:** all chart text is colored from tokens, so it reads in both themes.

## Accessibility and motion

- **Labels:** every input has a label. Range inputs carry an `aria-label`, and the segmented groups use `role="group"` with an `aria-label`.
- **Live region:** the verdict panel is `aria-live="polite"`. The phone bar is `aria-hidden` because it duplicates the panel.
- **Focus:** a 2px accent outline at 2px offset, via `:focus-visible`.
- **Table rows:** `tabindex="0"` and they activate with Enter or Space.
- **Motion:** the only transition is the verdict band's color, and only under `prefers-reduced-motion: no-preference`.
