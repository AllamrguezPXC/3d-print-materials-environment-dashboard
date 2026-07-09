---
name: react-chart-dashboard
description: Use when building React dashboard components, live reading cards, history charts, alert panels, and dark/light theme UI.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# React Chart Dashboard Skill

Use this skill for frontend dashboard work.

## UI rules

1. Dark mode by default.
2. Light/dark toggle persisted in localStorage.
3. Main dashboard should show current readings first.
4. Alerts must identify printer/location/spool/material.
5. Charts must support hourly historical averages.
6. Always include loading, error, and empty states.
7. Keep API calls in a centralized API client.

## Preferred components

- `ReadingCard`
- `SensorStatusGrid`
- `AlertPanel`
- `DryingRecommendationCard`
- `HistoryChart`
- `ThemeToggle`
