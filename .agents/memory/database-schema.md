---
name: Database schema
description: Full schema of the shared external PostgreSQL database vivi-n8n-stat on 77.95.201.27
---

## CRITICAL RULES
- Connect ONLY via VIVI_DATABASE_URL secret. Replit's DATABASE_URL / PG* are intentionally ignored in db.ts.
- This DB is shared with other systems (n8n, AmoCRM sync, Yclients, Yookassa). Never DROP or RENAME columns/tables.
- Read-only tables (filled by other systems): leads, amocrm_users, deal_note, deal_tags, yclients_record, yclients_services, loyalty, sources, yookassa, zvonki

## App-owned tables (read+write)

### `marketing_users` (6 rows)
PK: `name` VARCHAR. Fields: role, pin, department, bio, avatar_color, status, last_active.

### `leads_reporting` (app's own records)
PK: `id` VARCHAR generated as `lead-{timestamp}`. Required: manager_name, client_name, booking_date, status.
status values: booked, rescheduled, showed_up, no_show, cancelled.

### `commission_rules` (always 1 row, id='default')
base_salary, per_booking, per_deposit_collected, per_show_up, target_bookings, bonus_amount. Update via UPDATE only.

## Key read-only tables

### `leads` (67,530 rows) ⭐ KEY FOR AUTOCOMPLETE
AmoCRM deals. deal_id BIGINT PK, name, phone, source_name, utm_*, user_amo_id, pipeline_id, status_id.
Used by /api/leads/lookup to autofill client name+phone from AmoCRM deal URL.

### `yclients_record` (110,952 rows)
Yclients bookings: record_id, client_name, client_phone, date_visit, staff_name, attendance, company_id.

### `yookassa` (19,668 rows)
Payments: deal_id, summa, date, status, summa_komissia, payment_metod.

### `zvonki` (3,915 rows)
Calls with transcription: note_id, user_id, link_zvonok, duration, result_s2t, result_ai, contact_phone, date, user_name.

### Others (read-only)
amocrm_users (200): id, name. deal_note (42k): deal_id, note_text. deal_tags (74k): deal_id, tag_name. loyalty (8k). sources (24). yclients_services (297k).

**Why:** User explicitly stated: NEVER use Replit DB. Only external vivi-n8n-stat.
