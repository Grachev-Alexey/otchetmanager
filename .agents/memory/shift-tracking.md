---
name: Shift tracking
description: Work time tracking system — work_sessions table, ShiftWidget component, API routes.
---

## DB table: work_sessions
Columns: id (BIGSERIAL PK), manager_name, started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ (null=active), break_started_at TIMESTAMPTZ (null=not on break), total_break_secs INT.

## API (server/routes/shifts.ts → /api/shifts/*)
- GET  /active?name=X          → { active, session }
- POST /start                  → { success, session }
- POST /end                    → { success, workedSeconds }
- POST /break/start            → { success }
- POST /break/end              → { success }
- GET  /monthly?name&year&month → { totalSeconds }
- GET  /monthly-all?year&month  → { [managerName]: totalSeconds }

## Client timer
ShiftWidget (src/components/ShiftWidget.tsx) uses setInterval(1000) purely on the client.
No server polling — only API calls on state transitions (start/end/break).
Placed in Sidebar between user card and nav, visible only to managers (role === 'manager').

**Why:** Server polling every second would stress the DB. Timer accuracy is sufficient with client-side calculation from stored startedAt timestamp.

**How to apply:** When the DB is not connected, shifts return fallback:true and are not persisted (acceptable for local dev mode).
