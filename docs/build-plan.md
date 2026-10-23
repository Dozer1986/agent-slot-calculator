# Agent Slot Calculator port

| Decision | Cost |
| --- | --- |
| Port the supplied prototype to static Astro components and one TypeScript controller. | Preserve its ids, styling and copy while adding DOM types. |
| Keep the supplied model, presets and parity vectors byte-identical. | Known model edges remain visible in the delivery notes. |
| Test the public model exports and the rendered browser controls. | Run Vitest and Playwright locally because account billing blocks Actions. |
| Self-host Archivo with both weight and width axes and IBM Plex fonts. | Bundle font assets with the site. |
| Prepare GitHub Pages deployment for the project base path. | Repository settings and the actual deployment remain outside this worker stage. |

## Steps

1. Scaffold Astro with strict TypeScript, add the model and browser test tools, and establish the persona and CI gate before feature work.
2. Commit a failing model parity test, then copy the supplied model and presets unchanged and run its 32 vectors plus defaults.
3. Add a failing browser default-result test, port CSS and section markup, then type the prototype controller and import the model.
4. Cover the remaining acceptance behavior through the browser, compare 400px and 1280px in both themes, and build the static output.
5. Document results and known edges, commit the completed source, and hand the branch to firstmate for the no-mistakes stage.

## Test boundaries

Vitest calls the exported model with the supplied fixed vectors. Playwright drives the built site at `/agent-slot-calculator/`, observes verdicts, edits controls, activates table rows, reloads persisted settings, and blocks the storage boundary. Browser evidence covers layout, focus, motion and same-origin assets. This static site has no database or API.

## Known handoff edges

- `ramFitBuilds` divides by `slotGB`; keep the model unchanged and reject zero memory per build in the UI.
- Capacity search stops at 400 agents.
- The prototype requests Archivo widths 62–125 while DESIGN.md describes 72–112; ship the font range used by the CSS.

## Delivery boundary

This branch prepares deployment. It does not enable Pages settings, merge, or deploy. A push to this feature branch runs no deployment; merging to `main` reaches GitHub Pages via `.github/workflows/deploy.yml`. Actions currently cannot run because account payments failed, so local results are the validation evidence.
