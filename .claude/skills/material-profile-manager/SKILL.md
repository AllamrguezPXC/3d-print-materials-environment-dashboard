---
name: material-profile-manager
description: Use when implementing filament material profiles, environmental limits, derivative material handling, humidity alerts, and drying recommendations.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Material Profile Manager Skill

Use this skill for material domain logic.

## Rules

1. Seed material defaults from `docs/Requirements.md`.
2. Store thresholds in the database as editable profiles.
3. Manufacturer-specific profiles override generic family defaults.
4. Derivatives inherit from parent family unless overridden.
5. Humidity drives readiness status.
6. Pressure is recorded for traceability, not normally readiness.
7. Drying recommendations are advisory only.
8. Warn if dryer cannot reach recommended temperature.

## Materials to seed

- PLA and derivatives
- PETG / CPE and derivatives
- ABS
- ASA
- Nylon / PA
- PC
- TPU / TPE
- PVB
- PVA
- BVOH
