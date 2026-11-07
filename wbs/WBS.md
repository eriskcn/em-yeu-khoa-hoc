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
| R3 | M1: 7v7 events, possession, rule checks | #5–#8, #12 | Not Started |
| R4 | M2: replay and undo | #13, #23 | Not Started |
| R5 | M3: annotations | #15, #16 | Not Started |
| R6 | M4: analysis | #21 | Not Started |
| R7 | M5: 7v7 match rules | #20 | Not Started |
| R8 | M6: mobile, touch, a11y, i18n | #14, #18, #19 | Not Started |
| R9 | M7: extend to 5v5 and 11v11 | — | Not Started |
