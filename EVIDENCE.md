# EVIDENCE.md

# Claude Code Evidence

Use this file to document evidence required by the assignment.

## Checklist

| Requirement | Evidence | Status |
|---|---|---|
| Plan Mode + Ask Mode | Plan Mode used to audit `.claude`/produce the build plan (see below); Ask Mode used via `AskUserQuestion` for .claude cleanup strategy, Git/GitHub setup, and dryer modeling decisions | Done |
| `/init` and `CLAUDE.md` | Root `CLAUDE.md` audited and extended with Task Documentation, Git Workflow, Testing Requirements, and Playwright MCP sections adapted from `Inpiration CLAUDE.md` | Done |
| TDD cycle | `/evidence/tdd-current-reading-fail.txt` and `/evidence/tdd-current-reading-pass.txt` — see summary below | Done |
| Documentation | `README.md`, `docs/Requirements.md`, `docs/Tasks.md`, root `CLAUDE.md` | Started (will finalize with README setup instructions once frontend exists) |
| Security review | `/evidence/security-review.md` | Pending |
| GitHub Integration | Repo created and pushed via `gh` CLI (no GitHub MCP server connected this session — see note below): https://github.com/AllamrguezPXC/3d-print-materials-environment-dashboard | Started (issue/PR evidence pending) |
| Custom Skill | `.claude/skills/*/SKILL.md` — `context-handoff` skill adapted from an unrelated prior project to this one; `fastapi-endpoint-builder` used to build `GET /readings/current` | Done |
| Custom Hook | `.claude/hooks/*`, `.claude/settings.json` — `guard-dangerous-commands.py` and `evidence-logger.py` active from the start; `pre-compact-context-handoff.py` adapted and wired into `PreCompact`, verified via `test-fixtures/precompact-auto.json` | Done |

## Plan Mode / Ask Mode

Before any implementation, Plan Mode was used to read `docs/Requirements.md`, `docs/Tasks.md`,
`docs/Prompt_Pack.md`, `CLAUDE.md`, the existing `.claude/` folder, and `Inpiration CLAUDE.md`,
then audit which `.claude` agents/hooks/skills were reusable, adaptable, or leftover from an
unrelated prior project ("PAUL Dashboard Data Analisis"). The resulting plan was saved and
approved before any file was modified. `AskUserQuestion` (Ask Mode) was used three times during
planning to resolve decisions that were the user's to make: how to handle the stale `.claude`
content (adapt the context-handoff system, delete the rest), how to set up Git/GitHub given no
GitHub MCP server was connected, and how to model dryer capability in the data model.

## GitHub Integration Note

No GitHub MCP server was connected in this Claude Code session (only `markitdown` and
`playwright` MCP tools were available). Per explicit user instruction, GitHub setup was performed
directly with the `gh` CLI instead: `git init`, initial commit, `gh repo create ... --push`. This
is documented here as satisfying the GitHub-integration requirement in spirit; a further `gh`
action (issue or PR) referencing completed backend work will be added once available.

## TDD Cycle — `GET /readings/current`

1. Wrote `backend/tests/api/test_readings_current.py::test_get_current_reading_returns_mock_data`
   against the not-yet-existing route.
2. Ran `pytest` — failed with `404` (route did not exist). Captured to
   `evidence/tdd-current-reading-fail.txt`.
3. Implemented the minimum: `SensorReadingDTO`, the `SensorReader` protocol, `MockSensorReader`
   (bounded random walk + daily sinusoid + rare spikes, clamped to realistic bounds),
   `DracalVcpSensorReader` (VCP line parser), the sensor factory, `environment_service` (dew point
   + current-reading assembly), and the `GET /readings/current` route.
4. Re-ran `pytest` — passed. Captured to `evidence/tdd-current-reading-pass.txt`.
5. Added unit tests for the sensor layer alongside this cycle: mock-sensor bounds/drift
   (`tests/sensors/test_mock_sensor.py`) and the Dracal VCP parser — valid line, malformed line,
   wrong serial, missing channel, non-numeric channel (`tests/sensors/test_dracal_vcp_parser.py`).
6. Full suite: `cd backend && pytest` — 11 passed.

## Notes

Do not mark anything complete until the action has actually been performed in Claude Code or GitHub.
