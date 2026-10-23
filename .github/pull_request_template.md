## Change

No linked issue

## Validation

Red commit:
Interrogate report: docs/interrogate-report.md

## Exploratory UI evidence

Identify the independent agent, persona journeys, and screenshot links before merge.

## Known handoff edges

- Memory per build of zero divides by zero in `ramFitBuilds`. The UI rejects zero without changing model math.
- The capacity search stops at 400 agents.
- The prototype requests Archivo widths 62–125 while DESIGN.md describes 72–112. Self-host the width axis used by the CSS.
