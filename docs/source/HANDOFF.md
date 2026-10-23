# Agent Slot Calculator: build brief for Claude Code

Build the calculator in `prototype/agent-slot-calculator.html` as a static **Astro** site in a new repository on the user's personal GitHub. Build it as designed: the same layout, behavior, copy and numbers as the prototype. This brief says how; the prototype is the source of truth for anything this brief doesn't spell out.

## Context

The user runs a two-person software company that runs 20+ AI coding agents at once (Claude Code, Codex and similar, on cloud APIs; no local models, no GPUs). Each agent builds a repo and runs its test suite, so the question is which hardware to buy for that load. Their research is in `docs/research-report.md`. The calculator answers one question about any machine: how many agents can it carry at once, what does each agent slot cost over its life, and does it beat buying a 128 GB Core Ultra 7 270K Plus desktop?

Open the prototype in a browser before writing anything. Click through it at phone width and desktop width, in light and dark mode.

## What's in this package

| Path | What it is | How to use it |
|---|---|---|
| `prototype/agent-slot-calculator.html` | The working calculator: one self-contained HTML file | Source of truth for layout, CSS, copy and behavior |
| `seed/src/lib/model.ts` | The capacity and cost model as pure TypeScript | Copy into the repo as is |
| `seed/src/data/presets.ts` | The 23 preset machines and default assumptions | Copy into the repo as is |
| `seed/test/model.test.ts` | Vitest parity tests | Copy into the repo; must pass |
| `seed/test/test-vectors.json` | 32 expected outputs generated from the prototype | Copy into the repo; never regenerate to make a test pass |
| `DESIGN.md` | Tokens, type, layout, components, chart | Reference while porting the CSS and markup |
| `CLAUDE.md` | Project instructions for the new repo | Put at the repo root |
| `docs/research-report.md` | The research behind every default and preset | Put at `docs/` in the repo and link it from the README |

`model.ts` and `presets.ts` are already ported and verified: they reproduce all 32 test vectors exactly. Don't change the math or the numbers.

## Where it goes

- **Repository:** a new repo on the user's personal GitHub account. The suggested name is `agent-slot-calculator`. **Before running `gh repo create`, confirm the name and the visibility with the user.** Default to private.
- **Deployment:** not decided yet. Ask the user. GitHub Pages through the official `withastro/action` workflow is the natural fit for a static site. If they pick Pages for a project repo, set `site` and `base` in `astro.config.mjs` so assets resolve under `/<repo>/`. Don't add a deploy workflow until they confirm.

## Stack

- **Astro**, current stable release, `output: 'static'`, TypeScript `strict`.
- **No UI framework.** The page is static markup plus one vanilla TypeScript client script, as in the prototype. Don't add React, Svelte or Tailwind.
- **Vitest** for the model tests.
- **Fonts:** self-host with Fontsource rather than calling Google at runtime.
  - Archivo, the variable version with the width axis. The design uses widths from 72% to 112%, so use the package's CSS file that includes `wdth`.
  - IBM Plex Sans 400/500/600.
  - IBM Plex Mono 400/500/600.
  - If a package or axis isn't available, keep the prototype's Google Fonts `<link>` instead.
- **No other runtime network calls.** All data is local.

## Suggested structure

```
agent-slot-calculator/
├─ CLAUDE.md
├─ README.md
├─ astro.config.mjs
├─ package.json
├─ tsconfig.json
├─ vitest.config.ts            (only if Astro's default config needs it)
├─ docs/research-report.md
├─ public/favicon.svg          (a simple original glyph; no brand marks)
├─ src/
│  ├─ layouts/Base.astro       (html/head/body, fonts, global CSS)
│  ├─ pages/index.astro        (composes the sections, loads the client script)
│  ├─ components/
│  │  ├─ Header.astro
│  │  ├─ MachinePanel.astro
│  │  ├─ VerdictPanel.astro
│  │  ├─ WorkloadPanel.astro
│  │  ├─ ComparisonTable.astro
│  │  ├─ HowItWorks.astro
│  │  └─ PhoneBar.astro
│  ├─ lib/model.ts             (from seed, unchanged)
│  ├─ data/presets.ts          (from seed, unchanged)
│  ├─ scripts/calculator.ts    (DOM controller, ported from the prototype)
│  └─ styles/global.css        (tokens + component CSS, ported from the prototype)
└─ test/
   ├─ model.test.ts            (from seed)
   └─ test-vectors.json        (from seed)
```

## Build steps

1. **Scaffold.** Use `npm create astro@latest` with the minimal template and strict TypeScript, then add Vitest and a `test` script. If `resolveJsonModule` isn't on, enable it so the test can import the vectors.
2. **Bring in the model first.** Copy the `seed/` files into place, adjusting the import paths in `model.test.ts` if your layout differs. Run `npm test`; all tests must pass before you touch the UI.
3. **Port the CSS.** Move the prototype's two `<style>` blocks into `src/styles/global.css`, unchanged apart from the replacements listed below. Keep every token, both dark-mode blocks and every breakpoint.
4. **Port the markup.** Split the prototype's sections into the components above. Keep every element `id`, class name and piece of copy exactly as it is, because the controller and the CSS depend on them.
5. **Port the controller.** Move everything in the prototype's `<script>` that isn't between `// MODEL START` and `// MODEL END` into `src/scripts/calculator.ts`. Type it, and replace the inline model with imports from `lib/model` and `data/presets`. That covers:
   - the field definitions and `buildField`
   - `loadPreset`, `syncMachine` and `syncWork`
   - `save` and `restore`, with the same localStorage key `agent-slot-calc-v1`
   - `render`, `drawChart`, `renderTable` and `init`

   Load it with a `<script>` tag in `index.astro` so Astro bundles it.
6. **Make the replacements below**, which strip out pieces that only existed for the prototype's host.
7. **Write the repo README.** Cover what the calculator answers, how to run it (`npm install`, `npm run dev`, `npm test`, `npm run build`), the model in five lines (copy the "How the numbers work" list), where the presets come from (link `docs/research-report.md`), and that prices are October 2026 and some figures are estimates.
8. **Check against the acceptance list**, then ask the user about creating the repo, pushing and deploying.

## Replacements: prototype host vs. standalone site

The prototype ran inside a hosted viewer that supplied a few things. In Astro:

| Prototype | Standalone |
|---|---|
| `<meta name="claude:viewport-fit-sides" content="cover">` | Remove. |
| Viewport meta supplied by the host | Add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` and `<meta charset="utf-8">`. |
| Host reset | Add to the top of `global.css`: `body { margin: 0 }`, `img { max-width: 100% }`, `[hidden] { display: none !important }`, and `:root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px) }`. |
| `<title>` at the top of the file | Set it in `Base.astro`: `Agent Slot Calculator`. Add a meta description: "How many concurrent coding agents a machine can carry, what each slot costs over its life, and whether it beats a 128 GB desktop." |
| Google Fonts `<link>` | Fontsource imports (see Stack), keeping the same family names in the CSS font tokens. |
| Second `<style>` block at the end (styles for `#reset`) | Merge into `global.css`. |
| `class="seg-like"` on the reset button | Unused; drop it. |
| `[data-theme]` CSS blocks | Keep. They're harmless without a toggle, and a toggle may come later. |

## Behavior that must survive the port

The prototype has all of this working; it's listed so nothing gets lost.

**Machine panel**
- The preset `<select>` has optgroups by group, plus "Custom (edited)".
- Editing any machine field, the name, the owned checkbox or the OS reserve switches the select to Custom.
- Six slider-and-number pairs (price, memory, single-thread, multi-thread, idle W, full-load W) stay in sync. The number box can go past the slider's max.
- "I already own it" makes cost count power only.
- The OS reserve toggle is Linux 6 GB or macOS 8 GB.
- The optional RAM upgrade (target GB and cost) produces a flag line.
- The preset's note shows under the form.

**Verdict panel**
- The verdict band and pill change color by state (`ok` / `warn` / `bad`).
- A big agent count with the limit text.
- Four metrics: hardware per agent, lifetime per agent, power per year, and vs. the 128 GB desktop.
- The fleet line: boxes needed for the target agent count, up-front cost and lifetime cost, compared with the reference box.
- Flags: slow cores, below one build slot, memory-bound with spare CPU, CPU-bound with spare memory, the upgrade scenario, and owned.
- The SVG distribution chart.

**Workload panel**
- Duty cycle, memory per build (with chips: Python 6, TS/Ruby 8, Mixed 12, Rust/C++/Java 16), agents wanted and electricity.
- "More assumptions": threads per build, memory per idle agent, serial share, time at full load, years, and the 128 GB desktop price.
- "Reset to report defaults".

**Comparison table**
- Every preset is evaluated under the current workload settings.
- Grouped "To buy" and "Already yours · power only", each sorted by lifetime per agent.
- The current preset row is highlighted.
- Clicking a row, or pressing Enter or Space on it, loads that preset; on phones it then scrolls to the machine panel.
- The table scrolls sideways inside its own container.

**Phone bar**
- Below 920px, a fixed bottom bar shows agents, lifetime per agent and the verdict pill, padded for safe areas.
- At 920px and up the verdict panel becomes a sticky right column instead.

**Persistence**
- Workload, machine and preset are saved to localStorage on every render and restored on load.
- Every storage call is wrapped in try/catch, so the page works with storage blocked.

## Acceptance checklist

- [ ] `npm test` passes all parity tests (32 vectors plus defaults).
- [ ] `npm run build` succeeds with no TypeScript errors and outputs a static site.
- [ ] Side by side with the prototype at 400px and 1280px, in light and dark, the page looks the same. Small font-rendering differences are fine.
- [ ] With the defaults and the "Core Ultra 7 270K Plus · 128 GB" preset, the page shows 14 agents, limited by memory, $214 hardware per agent, $305 lifetime per agent, and "Worth it".
- [ ] With "Lenovo M920q · i5-8500T · 16 GB (used)", it shows 0 agents and "Can't hold an agent".
- [ ] Setting the duty cycle to 15% raises the 270K Plus 128 GB box to 26 agents.
- [ ] No horizontal page scroll at 400px; only the table scrolls inside its own container.
- [ ] Every control is reachable by keyboard with a visible focus ring, and table rows activate with Enter and Space.
- [ ] Reloading keeps the inputs. With storage blocked (a private window in some browsers), the page still works.
- [ ] No network requests at runtime beyond the site's own assets.
- [ ] `prefers-reduced-motion` is respected (the only transition is the verdict band's color).

## Out of scope for v1 (ask before building)

- A DGX Spark preset. The user owns one, but there are no published PassMark scores for it yet; the user can enter it as a custom machine.
- State in the URL, so a configuration can be shared with a link.
- A light/dark toggle.
- Editing or adding presets from the UI, or loading them from JSON.
- CSV export of the comparison table.
- Updating prices. When that happens, update `presets.ts`, regenerate `test-vectors.json` on purpose, and note the date and source in the commit.

## Rules

- Don't change the model's math, the presets or the defaults during the port. If something looks wrong, tell the user rather than "fixing" it.
- Keep copy word for word; it was written carefully. If you find a typo, point it out.
- Keep the page fast and dependency-light: no framework, no analytics, no trackers.
- Commit in small steps: scaffold, model and tests, styles, markup, controller, README.
