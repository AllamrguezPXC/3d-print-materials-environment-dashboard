---
name: fastapi-endpoint-builder
description: Use when creating or modifying FastAPI endpoints, Pydantic schemas, SQLAlchemy persistence, and pytest coverage for this project.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# FastAPI Endpoint Builder Skill

Use this skill for backend endpoints in the environmental monitoring dashboard.

## Required workflow

1. Read the relevant section of `docs/Requirements.md`.
2. Identify the route, schema, service, repository, and test files needed.
3. Write or update pytest tests first when practical.
4. Keep route handlers thin.
5. Put business logic in services.
6. Validate request and response models with Pydantic.
7. Use SQLAlchemy for persistence.
8. Run backend tests or explain why they were not run.

## Endpoint rules

Mandatory endpoints must remain available:

- `GET /readings/current`
- `POST /readings`
- `GET /readings?from=&to=`

Do not bypass the sensor abstraction. Do not make real hardware mandatory for tests.
