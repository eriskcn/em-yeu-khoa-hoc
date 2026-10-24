---
name: wbs
description: Work Breakdown Structure project tracking. Use ONLY when the user explicitly asks to create a WBS, plan/track a project with WBS, or write a WBS progress report.
---

# WBS

Active for the current project until the user disables it.

## Init
Create if missing:
```text
wbs/
├── WBS.md
└── reports/
```
`WBS.md` contains: objective, deliverables, task hierarchy, dependencies, success criteria, per-task status (Not Started | In Progress | Blocked | Completed).

## Maintenance
- Keep `WBS.md` in sync with approved work and update statuses as work progresses.
- No speculative tasks. No scope expansion without user approval.
- If a task introduces a significant architectural decision, recommend an ADR before implementation. Do not create it without confirmation.

## Progress report
On request, create `wbs/reports/YYYY-MM-DD-HHMM-progress.md`. Never overwrite previous reports.
Sections: completed, current work, remaining work, risks/blockers, scope changes, overall completion estimate.