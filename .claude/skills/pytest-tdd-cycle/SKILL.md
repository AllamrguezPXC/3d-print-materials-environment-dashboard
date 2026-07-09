---
name: pytest-tdd-cycle
description: Use when running a test-driven development cycle with pytest and saving failing/passing evidence for the assignment.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# pytest TDD Cycle Skill

Use this skill to satisfy the assignment’s TDD requirement.

## Required output

1. Name the behavior under test.
2. Write the failing pytest first.
3. Run pytest and save failure output to `/evidence`.
4. Implement only enough code to pass.
5. Run pytest again and save passing output to `/evidence`.
6. Update `EVIDENCE.md` with a short summary.

## Recommended targets

- `GET /readings/current`
- Dracal VCP parser
- hourly reading aggregation
- humidity alert service
