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
