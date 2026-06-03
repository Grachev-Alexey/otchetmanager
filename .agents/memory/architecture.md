---
name: Project architecture
description: Full modular structure, key conventions, and production-readiness decisions for Виви Маркетинг.
---

# Виви Маркетинг — Architecture

## Server structure (entry: server.ts)
- `server/localFallback.ts` — DATA_DIR setup, DEFAULT_USERS/RULES constants, read/write helpers for JSON fallback
- `server/db.ts` — pg.Pool singleton (`db` object), bootstrapDb() seeds tables + default data; runs migrations for work_sessions table and new commission_rules columns
- `server/routes/auth.ts` — login/logout + in-memory rate limiter (10/min per IP, Map-based)
- `server/routes/leads.ts` — CRUD leads (upsert via ON CONFLICT)
- `server/routes/rules.ts` — GET/POST commission rules; merges RULE_DEFAULTS for stale/missing fields
- `server/routes/users.ts` — CRUD users
- `server/routes/shifts.ts` — 7 endpoints: active (returns todayPriorSeconds), start, end, break/start, break/end, monthly, monthly-all; sessions capped at 16h MAX

## Frontend structure (entry: src/App.tsx)
- `src/api/client.ts` — centralized typed fetch wrapper, ApiError class; shifts.active returns `{ active, session, todayPriorSeconds }`
- `src/hooks/useData.ts` — leads/rules/allUsers state + refreshLeads/Rules/Users/initialize
- `src/types.ts` — CommissionRules (perShowUpHigh/Low, perPoHigh/Low, hourlyRate, poThreshold), ShiftSession
- `src/pages/LoginPage.tsx` — PIN login form
- `src/pages/DashboardPage.tsx` — stats cards + KPI board + admin manager board
- `src/pages/LeadsPage.tsx` — form + list wrapper
- `src/pages/StaffDirectoryPage.tsx` — staff grid
- `src/pages/UserManagementPage.tsx` — admin user CRUD (self-contained)
- `src/components/Sidebar.tsx` — nav + session info + ShiftWidget (managers only)
- `src/components/Header.tsx` — breadcrumb + "Внести запись" button
- `src/components/LeadForm.tsx`, `LeadList.tsx`, `SalarySummary.tsx` — domain components
- `src/components/ShiftWidget.tsx` — cumulative daily timer using priorSecs from active API; idle/active/on_break states

## Commission formula (CRITICAL)
- **ПО = предоплаты = depositPaid === true count** — NOT totalBookings, NOT showed_up
- Formula: `showUps × visitRate + (workedSecs/3600) × hourlyRate + deposits × poRate`
- Rates switch if `deposits > poThreshold`: visitRate = perShowUpHigh/Low, poRate = perPoHigh/Low
- Applied in: `calcSalary()` in DashboardPage.tsx and SalarySummary.tsx (same signature: showUps, deposits, workedSecs, rules)
- `overThreshold` in SalarySummary uses `perf.totalDeposits`, not `perf.totalBookings`

## Key decisions
- **No timer-based polling in useData** — App.tsx polls leads every 30s (visibility-aware) after login. Rules/users only refreshed after mutations.
- **Mutation-invalidation pattern** — after every api.leads.save/delete call, refreshLeads() is called immediately.
- **Rate limiting is in-memory** — sufficient for single-instance.
- **data/ directory** in .gitignore — runtime-only JSON fallback, not committed.
- **DB vs local fallback** — `db.isConnected` gates every route; local JSON files used when no VIVI_DATABASE_URL set.
- **DEFAULT_USERS in localFallback.ts** — imported by db.ts for seeding; single source of truth.
- **Session stored in localStorage** under key `vivi_marketing_session`.
- **ShiftWidget priorSecs** — todayPriorSeconds from /api/shifts/active = sum of all ended sessions today. elapsed starts at priorSecs so timer is cumulative across multiple session starts.
