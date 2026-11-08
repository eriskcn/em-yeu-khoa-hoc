# WBS: football-replay

## Objective
Improve `football-replay/index.html` (single-file football scenario simulator: players, ball, timeline, events) so scenarios can be saved, shared and used reliably, without changing its single-file, no-build structure.

## Review of current state (2026-11-06)
Facts, from reading `football-replay/index.html` (910 lines):
- Features: 5/7/11-a-side, team colors, drag to create keyframes, 8 event types (pass, cross, shot, dribble, tackle, block, duel, aerial), timeline scrubbing, play/speed, VI/EN, keyboard shortcuts, DPR-aware canvas.
- Gaps:
  - No save/load/export. A scenario is lost on reload.
  - No undo/redo; destructive actions (reset, mode change, delete) are immediate.
  - No link back to the home page.
  - `requestAnimationFrame` loop redraws every frame, even when idle.
  - No page-level theme/lang sync with the home page (own VI default, own styles).
  - Accessibility: buttons are unlabeled by aria, canvas has no text alternative, no reduced-motion handling.
  - No automated tests; all logic is in one inline `<script>` (interp, ballOfEvent, createEvent are pure-ish but not testable in isolation).
- Not verified: behavior on touch devices (only one `touch-action` rule exists), mode-change handling of existing events.

## Deliverables
1. Persistent scenarios (local save + file export/import).
2. Undo/redo.
3. Navigation and UX polish.
4. Idle-render fix and accessibility basics.
5. Minimal regression checks for core logic.

## Task hierarchy
Status: Not Started | In Progress | Blocked | Completed

| ID | Task | Depends on | Status |
|----|------|-----------|--------|
| 1 | Review current implementation | none | Completed |
| 2 | Persistence | none | Completed |
| 2.1 | Define scenario JSON shape (mode, colors, keyframes, events) | 1 | Completed |
| 2.2 | Export/import `.json` file buttons, with validation of imported data | 2.1 | Completed |
| 2.3 | Autosave to `localStorage` (try/catch, as on the home page) | 2.1 | Completed |
| 3 | Undo/redo | 2.1 | Completed |
| 3.1 | Snapshot stack on drag end / event create / delete / reset | 2.1 | Completed |
| 3.2 | Ctrl+Z / Ctrl+Shift+Z and buttons | 3.1 | Completed |
| 4 | UX polish | none | Completed |
| 4.1 | "Back to home" link | none | Completed |
| 4.2 | Confirm before reset / mode change when a scenario exists | none | Completed |
| 4.3 | Verify and fix touch drag on phones | none | Completed |
| 5 | Performance and accessibility | none | Not Started |
| 5.1 | Redraw only when state changes or while playing | none | Not Started |
| 5.2 | aria-labels on tool buttons, `aria-live` on status, canvas label | none | Not Started |
| 6 | Verification | 2, 3, 5 | Not Started |
| 6.1 | Assert-based self-check for `interp` / scenario (de)serialization | 2.1 | Not Started |
| 6.2 | Manual browser pass: desktop + mobile width, VI/EN | 2–5 | Not Started |
| 7 | Pre-record drawing (user-approved scope change 2026-11-07): arrow / line / area annotations, drawable while paused, saved with scenario, undoable | 2.1, 3 | Completed |
| 8 | Pass / cross / shot to an empty spot (user-approved scope change 2026-11-07): target stored as {x,y} | 2.1 | Completed |

## Out of scope (needs approval to add)
Splitting into multiple files/build step, video/GIF export, multiplayer/sharing server, new event types, theme sync with home page.

## Success criteria
- Reloading the page restores the last scenario; export then import reproduces an identical replay.
- Undo/redo reverts each editing action listed in 3.1.
- Idle page uses no continuous redraw (verified in browser performance/CPU).
- Core flows work at 375px width with touch.
- No console errors in a manual pass.

## Notes
- Task 2.1 fixes a data format other features depend on; consider an ADR only if the format must stay backward compatible. Not created.

## Audit backlog (2026-11-07, second audit; user-approved as GitHub issues)
Goal added by the audit: the tool becomes a three-phase Football Scenario Reconstruction and Tactical Analysis Tool (Setup → Simulation → Analysis). Items are tracked as GitHub issues; status here mirrors them. Nothing below is started.

| ID | Issue | Task | Priority | Depends on | Status |
|----|-------|------|----------|-----------|--------|
| 10.1 | #5 | Possession model; fix ball teleport | P0 | none | Not Started |
| 10.2 | #6 | Delete event leaves ghost ball move | P0 | none | Not Started |
| 10.3 | #7 | Overlapping ball events flagged | P0 | none | Not Started |
| 10.4 | #8 | Rule checks + Edit / Simulate mode | P0 | #5 | Not Started |
| 10.5 | #9 | Load old rectangle areas (convert to polygon) | P0 | none | Not Started |
| 11.1 | #17 | Split sim logic + automated tests | P1 | none (do early; guards #5–#8) | Not Started |
| 11.2 | #10 | Three-phase workflow shell | P1 | #5, #8 | Not Started |
| 11.3 | #11 | Phase 1 setup (pitch, formations, roles, possession) | P1 | #10 | Not Started |
| 11.4 | #12 | Phase 2 events (edit, reorder, new event types) | P1 | #5 | Not Started |
| 11.5 | #13 | Replay controls (frame step, prev/next, from event) | P1 | none | Not Started |
| 11.6 | #14 | Mobile layout and tap targets | P1 | none | Not Started |
| 12.1 | #15 | More annotation tools | P2 | none | Not Started |
| 12.2 | #16 | Time-linked annotations, views, compare | P2 | #10 | Not Started |
| 12.3 | #18 | Touch pinch / pan / multi-select | P2 | #14 | Not Started |
| 12.4 | #19 | Accessibility | P2 | none | Not Started |
| 12.5 | #20 | Match rules (out of play, goals, restarts, offside, subs) | P2 | #5, #11 | Not Started |
| 12.6 | #21 | Analysis metrics | P2 | #5 for possession stats | Not Started |
| 13.1 | #22 | Redraw loop idles | P3 | none | Not Started |
| 13.2 | #23 | Undo history: coalesce colour, keep time | P3 | none | Not Started |

Success criteria: each issue's acceptance line passes and, where #17 exists, is covered by a test.

## Rewrite (branch `refactor/football-replay-modular`, 2026-11-07; user-approved)
Plan: [docs/football-replay-plan.md](../docs/football-replay-plan.md). PoC kept in `football-replay-poc/`. 7v7 first; 5v5 and 11v11 after.

| ID | Task | Issues | Status |
|----|------|--------|--------|
| R0 | Back up PoC to `football-replay-poc/` | — | Completed |
| R1 | Write rewrite plan | — | Completed |
| R2 | M0: scaffold folders, 7v7 setup render + drag, Node test | #17, #22 | Completed |
| R3 | M1: 7v7 events, possession, rule checks | #5–#8, #12 | Completed (see gaps) |
| R4 | M2: replay and undo | #13, #23 | Completed (see gaps) |
| R5 | M3: annotations | #15, #16 | Completed (see gaps) |
| R6 | M4: analysis | #21 | Completed (see gaps) |
| R7 | M5: 7v7 match rules | #20 | Completed (see gaps) |
| R8 | M6: mobile, touch, a11y, i18n | #14, #18, #19 | In Progress (layout, a11y, pinch/pan done; multi-select, context menu, i18n not started) |
| R9 | M7: extend to 5v5 and 11v11 | — | Completed (see gaps) |

Done since: event editor (#12), annotation panel with windows and saved views (#16), match flow (goals, out of play, restarts, subs), 5v5/11v11 with an 11v11 offside warning, Substitute tool, mobile layout and ARIA labels.

Gaps left (tracked in the issues, not done): #16 compare-with-setup overlay; #12 curve/height editing and goalkeeper events; #20 free kicks, penalties, half-time, and the bench roster (a sub'd-on player cannot be subbed off); 5v5/11v11 pitch aspect and goal sizes are estimates; offside ignores level-with and edit mode; #14 tap-target sizes not measured; #18 touch pinch/pan and i18n not started; analysis possession share counts a ball in transit as loose; issue messages show internal player ids, not shirt numbers; tackle events exist in core but have no tool.

Done since M7: Setup/Simulation/Analysis phase shell (#10), formation selects (#11), scenario Export/Import incl. legacy rectangle areas (#9), defensive line / press zone / lane tools and setup ghost (#15, #16), pinch-zoom and two-finger pan (#18, shared view in `rendering/pitch-renderer.js`), goalkeeper `save` and half/full-time in core (no UI tool yet).
Open gaps: flip sides (core exists; goals and kick-off assume team 1 attacks left), pitch size, UI for save/penalty/half-time (#12, #20), multi-select and context menu (#18), i18n, player/ball radius ignore zoom.

## Audit 2026-11-08 (football-replay rewrite; report only, no code changed)
Load assumed: one person in one browser tab, scenarios of 1–60 s. Status: A1–A7, A9 Completed (branch `fix/football-replay-audit`); A8 partial (core tests added; `app.js` wiring has no test).

| ID | Priority | Task | Evidence |
|----|----------|------|----------|
| A1 | P0 | Shot at `goal` never scores: ball stops at x=1, `matchFlow` needs x>1; the UI clamps spots to 0..1, so score and restarts are unreachable from the UI | probe: score stays 0–0 |
| A2 | P0 | Cap event `t` and `dur` (e.g. 600 s) in `malformed`; a Start of 5000 s costs ~750 ms per render in `matchFlow` plus ~325 ms in `analyze` | probe timings |
| A3 | P0 | Validate imported `setup.players` (object, finite x/y, unique ids, team 0/1) and `ball.owner`; today `owner:99` or a `null` player throws on every render | probe: TypeError |
| A4 | P1 | Flag overlapping move/dribble events of one player (validator checks ball events only); second run makes the player jump (0.50,0.10 → 0.50,0.50 at t=1.0) | probe |
| A5 | P1 | Compute `matchFlow` and `analyze` possession only when setup/events change, not every frame (14 + 9 ms at 20 s duration, over the 16 ms frame budget) | probe timings |
| A6 | P1 | Autosave to `localStorage` in the rewrite (old 2.3 was Completed for the PoC; the rewrite has none, so reload loses the scenario) | grep: no localStorage |
| A7 | P2 | Substitute `on` number from `used` count collides after deleting an earlier sub | code read |
| A8 | P2 | Tests for A1, A3, A4 and for `app.js` wiring (none exists) | test list |
| A9 | P3 | Set canvas width/height only when size changes; delete `EVENT_TOOLS`, `listViews`, `visibleAt` (test-only); share one `clamp01` | grep |
