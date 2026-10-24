---
name: adr
description: Architecture Decision Records. Use ONLY when the user explicitly asks to create, record, or document an architecture decision, or enables ADR for the project.
---

# ADR

Active for the current project until the user disables it.
Only for significant, long-lived decisions (architecture, technology, data model, API, caching, authn/authz, deployment). Not for routine details or temporary workarounds.

## Storage
One file per decision in `adr/`, sequentially numbered: `001-authentication.md`, `002-caching-strategy.md`.

## Template
Title, Status (Proposed | Accepted | Superseded | Deprecated), Context, Decision, Consequences, Alternatives Considered (optional). Explain why, not how.

## Usage
- Read existing ADRs before proposing architectural changes.
- Follow accepted ADRs. If a proposal conflicts with one, explain the conflict before proceeding.
- Never rewrite accepted ADRs. To change a decision, create a new ADR referencing the old one and mark the old one Superseded.