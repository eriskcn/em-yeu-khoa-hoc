# football-replay rewrite plan

The first version (`football-replay-poc/`, one 1140-line file) is kept as a proof of concept. The rewrite starts again in `football-replay/`, **7v7 first**, then 5v5 and 11v11.

## Why restart
The PoC mixes state, simulation, drawing and input in one script. That blocked tests and the fixes in issues #5–#8 (possession, ghost ball, overlap, rule checks). The restart keeps one rule: **core is pure** (no DOM), so it runs and is tested in Node.

## Rules for the rewrite
- Vanilla JS, ES modules, no build step, no dependencies. Serve over HTTP (modules do not load from `file://`); GitHub Pages works.
- Coordinates are normalised 0..1 on the pitch. Only `rendering/` converts to pixels.
- State is plain data, updated by pure functions that return a new value.
- Replay is a pure function: `stateAt(setup, events, t)`. No hidden accumulated state.
- Per-format differences (players, formation, pitch ratio, offside, substitutions) live in one table in `core/match-rules.js`. No format-specific code paths.
- Render only when something changed, not every frame (issue #22).

## Folder map and ownership
| Folder | Files | Job |
|---|---|---|
| `core/` | `match-state`, `simulation-engine`, `event-engine`, `action-validator`, `match-rules` | Setup snapshot, state at time t, event list, rule checks, per-format config |
| `entities/` | `player`, `ball`, `team` | Small factories for plain data |
| `replay/` | `replay-engine`, `timeline`, `snapshot-manager` | Play/pause/seek/speed, time ↔ event mapping, undo and snapshots |
| `analysis/` | `tactical-analyzer`, `passing-analysis`, `spatial-analysis` | Metrics from state; exact vs approximate labelled |
| `rendering/` | `pitch-`, `player-`, `ball-`, `annotation-renderer` | Canvas drawing only |
| `interaction/` | `pointer-controller`, `drag-controller`, `drawing-controller` | Pointer Events to intents; no drawing, no rules |
| `ui/` | `toolbar`, `timeline-panel`, `analysis-panel`, `app` | DOM panels and the entry point wiring everything |

Dependency direction: `ui` → `interaction`, `replay`, `analysis`, `rendering` → `core` → `entities`. `core` imports nothing from the others.

## Three-phase workflow (from the audit)
Setup (initial snapshot) → Simulation (events over time) → Analysis (annotations and metrics). The setup is stored separately from the events (issue #10).

## Milestones
| ID | Scope | Issues |
|---|---|---|
| M0 | Scaffold all folders; 7v7 setup snapshot, pitch/player/ball render, drag to position, Reset; Node test for `match-state` | #17 (start), #22 |
| M1 | 7v7 events and possession: `event-engine`, `simulation-engine`, `action-validator`, 7v7 `match-rules`; Edit vs Simulate mode | #5, #6, #7, #8, #12 |
| M2 | Replay: play/pause/seek/speed, frame step, prev/next event, undo/redo | #13, #23 |
| M3 | Annotations: arrow, line, polygon, then curved/circle/text/freehand; time-linked, hide/show, views | #15, #16 |
| M4 | Analysis: distances, line heights, width/depth (exact); possession stats after M1 | #21 |
| M5 | 7v7 match rules: out of play, goals, restarts, substitutions | #20 |
| M6 | Mobile layout, touch (pinch/pan), accessibility, EN/VI | #14, #18, #19 |
| M7 | Extend to 5v5 and 11v11: add rows to the format table, offside for 11v11, per-format tests | — |

## Reuse from the PoC
- Scenario JSON idea (`v`, mode, keyframes, events) and its validate-on-load approach.
- Ball arc function, drawing code for pitch/players/ball, polygon area and shape drawing.
- Behaviour that was verified in the browser: deterministic seek, confirm before destructive actions, shot to spot or goal.
Do not copy: ball stored as keyframes, shared mutable globals, "last event wins" ball resolution.

## Done means (per milestone)
Node tests pass for core logic; the page loads over HTTP with no console errors; the milestone's issues meet their acceptance lines.
