# Виви Маркетинг — Дашборд команды

Внутренняя CRM-панель для команды менеджеров по продажам. React + Vite frontend, Express + PostgreSQL backend.

## Запуск

```bash
npm install
npm run dev   # Express + Vite на порту 5000
```

---

## ⚠️ БАЗА ДАННЫХ — ТОЛЬКО ВНЕШНЯЯ, НИКОГДА НЕ REPLIT

**Сервер:** `77.95.201.27:5432`  
**База:** `vivi-n8n-stat`  
**Подключение через секрет Replit:** `VIVI_DATABASE_URL`  
**Формат:** `postgresql://postgres:PASSWORD@77.95.201.27:5432/vivi-n8n-stat`

> Replit-managed DATABASE_URL и PG* переменные **намеренно игнорируются** в server/db.ts.  
> Подключение происходит ТОЛЬКО через `VIVI_DATABASE_URL`.  
> Эта база используется несколькими системами — не удалять и не переименовывать таблицы/колонки.  
> Добавлять новые колонки можно только с DEFAULT или nullable.

---

## Таблицы базы данных vivi-n8n-stat

### Таблицы, которые использует это приложение

---

#### `marketing_users` — 6 строк
Сотрудники: менеджеры и администраторы. PIN-авторизация.

| Колонка | Тип | Обязательно | Описание |
|---|---|---|---|
| `name` | VARCHAR | ✅ PK | Имя сотрудника = первичный ключ |
| `role` | VARCHAR | ✅ | `'admin'` или `'manager'` |
| `pin` | VARCHAR | ✅ | PIN для входа |
| `department` | VARCHAR | ✅ | Название отдела |
| `bio` | TEXT | — | Краткое описание |
| `avatar_color` | VARCHAR | ✅ | Tailwind gradient, напр. `from-blue-500 to-indigo-500` |
| `status` | VARCHAR | — | `'online'` / `'offline'` |
| `last_active` | VARCHAR | — | Строка с временем активности |

---

#### `leads_reporting` — рабочая таблица записей
Записи клиентов на визиты, созданные менеджерами в этом приложении.

| Колонка | Тип | Обязательно | Описание |
|---|---|---|---|
| `id` | VARCHAR(100) | ✅ PK | Генерируется как `lead-{timestamp}` |
| `manager_name` | VARCHAR | ✅ | Имя менеджера (FK к `marketing_users.name`) |
| `client_name` | VARCHAR | ✅ | ФИО клиента |
| `client_phone` | VARCHAR | — | Телефон клиента |
| `amocrm_lead_id` | VARCHAR | — | Числовой ID сделки AmoCRM |
| `booking_date` | DATE | ✅ | Дата записи |
| `status` | VARCHAR | ✅ | `booked` / `rescheduled` / `showed_up` / `no_show` / `cancelled` |
| `deposit_required` | BOOLEAN | — | Требуется предоплата (default: false) |
| `deposit_amount` | NUMERIC(12,2) | — | Сумма предоплаты в рублях |
| `deposit_paid` | BOOLEAN | — | Предоплата внесена |
| `comments` | TEXT | — | Примечания |
| `created_at` / `updated_at` | TIMESTAMPTZ | — | Временные метки |

---

#### `commission_rules` — 1 строка (всегда `id = 'default'`)
Настройки расчёта зарплаты. Обновлять через UPDATE, не INSERT.

| Колонка | Текущее значение | Описание |
|---|---|---|
| `base_salary` | 40 000 ₽ | Базовый оклад |
| `per_booking` | 1 000 ₽ | Бонус за каждую запись |
| `per_deposit_collected` | 1 500 ₽ | Бонус за собранную предоплату |
| `per_show_up` | 2 000 ₽ | Бонус за визит клиента |
| `target_bookings` | 15 | Цель по записям для бонуса |
| `bonus_amount` | 10 000 ₽ | Бонус при достижении цели |

---

### Остальные таблицы — ТОЛЬКО ЧТЕНИЕ, не изменять

Эти таблицы заполняются другими системами (n8n, AmoCRM, Yclients, Юкасса).

---

#### `leads` — 67 530 строк ⭐ ВАЖНО
Сделки из AmoCRM. **Используется для автозаполнения клиента по ID сделки.**

| Колонка | Тип | Описание |
|---|---|---|
| `deal_id` | BIGINT PK | ID сделки в AmoCRM |
| `contact_id` | BIGINT | ID контакта |
| `name` | VARCHAR | Имя клиента |
| `phone` | VARCHAR | Телефон клиента |
| `source_id` / `source_name` | — | Источник лида |
| `city` | VARCHAR | Город |
| `offer` | VARCHAR | Оффер |
| `list_wait` | BOOLEAN | В листе ожидания |
| `utm_source/medium/campaign/referrer` | VARCHAR | UTM-метки |
| `loss_reason` | VARCHAR | Причина отказа |
| `pipeline_id` / `status_id` | BIGINT | Воронка и статус в AmoCRM |
| `user_amo_id` | BIGINT | ID менеджера в AmoCRM |
| `create_date` / `update_date` | TIMESTAMP | Даты |

---

#### `amocrm_users` — 200 строк
Менеджеры AmoCRM: `id` (BIGINT), `name` (VARCHAR).

---

#### `deal_note` — 42 365 строк
Заметки к сделкам: `deal_id`, `note_id`, `note_text`, `create_datetime`.

---

#### `deal_tags` — 74 557 строк
Теги сделок: `deal_id`, `tag_name`, `tag_id`.

---

#### `yclients_record` — 110 952 строк
Записи из Yclients.

| Колонка | Тип | Описание |
|---|---|---|
| `record_id` | BIGINT PK | ID записи |
| `client_name` | VARCHAR | Имя клиента |
| `client_phone` | VARCHAR | Телефон клиента |
| `date_visit` | TIMESTAMP | Дата и время визита |
| `attendance` | INT | Статус: 1=пришёл, -1=не пришёл, 0=ожидание, 2=подтвердил |
| `staff_name` | VARCHAR | Мастер |
| `staff_id` | BIGINT | ID мастера |
| `company_id` | BIGINT | ID салона |
| `client_id` | BIGINT | ID клиента |
| `deleted` | BOOL | Запись удалена (не `is_deleted`!) |
| `visit_id` | BIGINT | ID визита |
| `success_visits` | INT | Успешных визитов |
| `fail_visits` | INT | Неудачных визитов |
| `create_date` | TIMESTAMP | Дата создания |
| `last_change_date` | TIMESTAMP | Дата последнего изменения |

---

#### `yclients_record_copy1` — 3 459 строк
Копия части записей Yclients (с доп. полем `lenght`).

---

#### `yclients_services` — 297 527 строк
Услуги из Yclients: `record_id`, `service_id`, `service_name`, `price`, `oplata`.

---

#### `yclients_services_copy1` — 12 127 строк
Копия части услуг Yclients.

---

#### `loyalty` — 8 052 строки
Программа лояльности: `client_id`, `name_loyalty`, `price`, `vznos`, `staff_name`, `date`.

---

#### `sources` — 24 строки
Справочник источников лидов: `id`, `name`.

---

#### `yookassa` — 19 668 строк
Платежи через Юкассу: `deal_id`, `summa`, `date`, `status`, `summa_komissia`, `payment_metod`.

---

#### `zvonki` — 3 915 строк
Звонки с транскрипцией: `note_id`, `user_id`, `source`, `link_zvonok`, `duration`, `result_s2t`, `result_ai`, `contact_phone`, `date`, `user_name`.

---

## API Эндпоинты

| Метод | URL | Описание |
|---|---|---|
| GET | `/api/leads` | Все записи из leads_reporting |
| GET | `/api/leads/lookup?amocrmId=XXXXX` | Поиск клиента: сначала в `leads`, потом в `leads_reporting` |
| POST | `/api/leads` | Создать/обновить запись |
| DELETE | `/api/leads/:id` | Удалить запись |
| GET | `/api/staff` | Список сотрудников |
| POST | `/api/staff` | Создать/обновить сотрудника |
| DELETE | `/api/staff/:name` | Удалить сотрудника |
| GET | `/api/commission` | Правила расчёта зарплаты |
| PUT | `/api/commission` | Обновить правила |
| POST | `/api/auth/login` | Вход по PIN |

---

## Структура проекта

```
server/
  db.ts               — подключение ТОЛЬКО через VIVI_DATABASE_URL
  routes/leads.ts     — CRUD записей + lookup по AmoCRM ID
  routes/staff.ts     — CRUD сотрудников
  routes/commission.ts
  routes/auth.ts
src/
  App.tsx             — роутинг, модал создания записи, floating button
  pages/
    LoginPage.tsx
    DashboardPage.tsx  — статистика и личная зарплата
    LeadsPage.tsx      — список записей
    SalaryPage.tsx     — зарплата команды (только admin)
    UserManagementPage.tsx  — управление командой (только admin)
  components/
    LeadForm.tsx       — форма: AmoCRM URL → автозаполнение → запись
    LeadList.tsx
    SalarySummary.tsx
    Sidebar.tsx / Header.tsx
```

---

## Роли

| | Manager | Admin |
|---|---|---|
| Главная (свои записи) | ✅ | ✅ |
| Записи | ✅ | ✅ |
| Зарплаты (вся команда) | ❌ | ✅ |
| Команда / Настройки | ❌ | ✅ |

---

## Технический стек

- React 19 + TypeScript + Vite + Tailwind CSS 4 + Framer Motion
- Express + tsx + PostgreSQL (pg)
- Анимации: **только opacity fade, 0.15–0.18s**. Никаких scale/y/backdrop-blur на анимируемых элементах.

---

## User preferences

- Язык: русский, без жаргона (не «KPI», не «лид», не «ведомость»)
- Цветной текст (labels, иконки) — лишний
- База данных: **ТОЛЬКО VIVI_DATABASE_URL → 77.95.201.27/vivi-n8n-stat. Replit DB — никогда.**
