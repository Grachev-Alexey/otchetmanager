---
name: Project architecture
description: Full modular structure, key conventions, and production-readiness decisions for Виви Маркетинг.
---

# Виви Маркетинг — Architecture

## Server structure (entry: server.ts, ~55 lines)
- `server/localFallback.ts` — DATA_DIR setup, DEFAULT_USERS/RULES constants, read/write helpers for JSON fallback
- `server/db.ts` — pg.Pool singleton (`db` object), bootstrapDb() seeds tables + default data
- `server/routes/auth.ts` — login/logout + in-memory rate limiter (10/min per IP, Map-based)
- `server/routes/leads.ts` — CRUD leads (upsert via ON CONFLICT)
- `server/routes/rules.ts` — GET/POST commission rules
- `server/routes/users.ts` — CRUD users

## Frontend structure (entry: src/App.tsx, ~232 lines)
- `src/api/client.ts` — centralized typed fetch wrapper, ApiError class
- `src/hooks/useData.ts` — leads/rules/allUsers state + refreshLeads/Rules/Users/initialize
- `src/pages/LoginPage.tsx` — PIN login form
- `src/pages/DashboardPage.tsx` — stats cards + KPI board
- `src/pages/LeadsPage.tsx` — form + list wrapper
- `src/pages/StaffDirectoryPage.tsx` — staff grid
- `src/pages/UserManagementPage.tsx` — admin user CRUD (self-contained)
- `src/components/Sidebar.tsx` — nav + session info
- `src/components/Header.tsx` — breadcrumb + "Внести запись" button
- `src/components/LeadForm.tsx`, `LeadList.tsx`, `SalarySummary.tsx` — domain components

## Key decisions
- **No timer-based polling in useData** — App.tsx polls leads every 30s (visibility-aware) after login. Rules/users only refreshed after mutations.
- **Mutation-invalidation pattern** — after every api.leads.save/delete call, refreshLeads() is called immediately.
- **Rate limiting is in-memory** — sufficient for single-instance. For multi-instance autoscale, replace with Redis.
- **data/ directory** in .gitignore — runtime-only JSON fallback, not committed.
- **DB vs local fallback** — `db.isConnected` gates every route; local JSON files used when no PGHOST/DATABASE_URL env vars set.
- **DEFAULT_USERS in localFallback.ts** — imported by db.ts for seeding; single source of truth.
- **Session stored in localStorage** under key `vivi_marketing_session` — on page load, App.tsx reads it and skips the login screen.
