## Change

No linked issue

## Validation

Red commit:
Interrogate report: docs/interrogate-report.md

## Exploratory UI evidence

Identify the independent agent, persona journeys, and screenshot links before merge.

## Known handoff edges

- Memory per build of zero is below the 4 GB slider minimum, but the number box accepts it and the prototype passes it to the model. `ramFitBuilds` divides by zero, so the chart shows "Memory fits 100+". It produces NaN only when usable memory exactly equals shown × residentGB. The port keeps prototype behavior and flags this edge for the user.
- The capacity search stops at 400 agents.
- The prototype requests Archivo widths 62–125 while DESIGN.md describes 72–112. Self-host the width axis used by the CSS.
