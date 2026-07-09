# Claude_Code_Workflow_Guide.md

# Claude Code Workflow Guide

This guide explains how to use Claude Code effectively for this project and how to produce the evidence required by the assignment.

## 1. Start in the Project Root

Open a terminal in:

```powershell
cd "C:\Users\AllamRodriguez\Desktop\Programas\3D Print Materials Environment Data Monitoring Dashboard"
claude
```

Before asking for implementation, tell Claude to read:

- `docs/Requirements.md`
- `docs/Tasks.md`
- `CLAUDE.md`
- existing `.claude/` files
- `Inpiration CLAUDE.md`

## 2. Do Not Blindly Overwrite Existing `.claude` Content

The current `.claude` folder contains artifacts from another project. First ask Claude Code to audit them:

```text
Review the existing .claude/agents, .claude/hooks, .claude/skills, .claude/context-handoffs, .claude/settings.json, and Inpiration CLAUDE.md. Identify what is reusable for this project, what should be modified, what should be archived, and what should be replaced. Do not overwrite anything until you show me the plan.
```

## 3. Use Plan Mode for Non-Trivial Work

Use Plan Mode before implementing:

- backend architecture
- database models
- sensor abstraction
- alert service
- frontend dashboard
- drying session workflow

Save screenshots or copied logs in `/evidence`.

## 4. Use Ask Mode for Clarifying Decisions

Good Ask Mode questions:

- Should the first implementation prioritize the three assignment endpoints or the configuration CRUD endpoints?
- Should the Dracal real reader use VCP serial mode first or CLI mode first?
- Should hourly averages be computed in SQL or Python for the MVP?
- What is the safest way to handle user-provided serial port names?

## 5. TDD Cycle

Required evidence:

1. Claude writes a pytest first.
2. Test fails.
3. Claude implements.
4. Test passes.

Recommended feature:

- `GET /readings/current`
- Dracal VCP parser

## 6. Suggested Subagent Usage

Use focused subagents when they reduce context clutter:

- `backend-fastapi-architect`: API, services, SQLAlchemy, pytest
- `sensor-integration-specialist`: Dracal VCP/CLI and mock sensors
- `frontend-react-dashboard`: React pages, charts, theme
- `qa-tdd-engineer`: tests and TDD evidence
- `security-reviewer`: security review for endpoints and hooks
- `docs-evidence-curator`: README and EVIDENCE.md
- `materials-domain-specialist`: material profiles and drying recommendations

Example prompt:

```text
Use the backend-fastapi-architect subagent to design the backend structure for docs/Requirements.md. Return a concise plan first. Do not implement until I approve.
```

## 7. Suggested Skill Usage

Use skills directly when useful:

```text
/fastapi-endpoint-builder Create the GET /readings/current endpoint based on docs/Requirements.md.
```

```text
/pytest-tdd-cycle Create a failing pytest for the Dracal VCP parser, then wait for approval before implementing.
```

```text
/react-chart-dashboard Build the History page with hourly averages from GET /readings.
```

```text
/evidence-capture Update EVIDENCE.md with the Plan Mode, TDD, and hook evidence collected so far.
```

## 8. Hook Evidence

The provided hooks are intended to:

- block destructive shell commands
- log prompt/tool/subagent events to `/evidence/claude-code-operations.jsonl`

After running Claude Code, confirm the evidence log exists.

## 9. Security Review Prompt

Use this after `POST /readings` and sensor access are implemented:

```text
Act as a security reviewer for this local FastAPI application. Review POST /readings, sensor selection, manual reading input, database persistence, CORS, and serial port handling. Identify risks, severity, and fixes. Then create /evidence/security-review.md with findings and update EVIDENCE.md with a summary.
```

## 10. GitHub MCP Evidence Prompt

After repository creation:

```text
Use GitHub MCP to create an issue titled "Implement required readings endpoints" with acceptance criteria from docs/Requirements.md. Then update EVIDENCE.md with what GitHub MCP action was performed.
```

## 11. Final Validation Prompt

```text
Run the backend tests, inspect the frontend setup, verify the three required endpoints, verify mock mode, and update README.md with exact run instructions. Then update EVIDENCE.md with a final checklist mapped to the assignment criteria.
```
