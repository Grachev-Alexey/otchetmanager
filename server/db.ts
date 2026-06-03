import pg from 'pg';
import dotenv from 'dotenv';
import { DEFAULT_RULES, DEFAULT_USERS } from './localFallback';

dotenv.config();

export const db = {
  pool: null as pg.Pool | null,
  isConnected: false,
  status: {
    provider: 'local' as 'local' | 'postgres',
    configured: false,
    error: '',
    connectionInfo: '',
    tableName: 'leads_reporting',
  },
};

// ONLY connect to the external vivi-n8n-stat DB via VIVI_DATABASE_URL.
// Replit's DATABASE_URL / PG* vars are intentionally ignored.
const viviUrl = process.env.VIVI_DATABASE_URL;

if (viviUrl) {
  try {
    db.pool = new pg.Pool({
      connectionString: viviUrl,
      ssl: false,
      connectionTimeoutMillis: 8000,
    });
    db.status.provider = 'postgres';
    db.status.connectionInfo = '77.95.201.27:5432/vivi-n8n-stat';
  } catch (err: any) {
    db.status.error = err.message || 'Failed to initialize Postgres pool';
    console.error('[DB] Pool init error:', err);
  }
} else {
  console.warn('[DB] VIVI_DATABASE_URL is not set — running in local JSON fallback mode. Set the secret to connect to vivi-n8n-stat.');
}

export async function bootstrapDb(): Promise<void> {
  if (!db.pool) return;
  try {
    const client = await db.pool.connect();
    console.log('[DB] Connected to vivi-n8n-stat PostgreSQL.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS leads_reporting (
        id VARCHAR(100) PRIMARY KEY,
        manager_name VARCHAR(255) NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        client_phone VARCHAR(100),
        amocrm_lead_id VARCHAR(255),
        booking_date DATE NOT NULL,
        status VARCHAR(100) NOT NULL,
        deposit_required BOOLEAN DEFAULT FALSE,
        deposit_amount NUMERIC(12,2) DEFAULT 0,
        deposit_paid BOOLEAN DEFAULT FALSE,
        comments TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS commission_rules (
        id VARCHAR(50) PRIMARY KEY,
        base_salary NUMERIC(12,2) NOT NULL,
        per_booking NUMERIC(12,2) NOT NULL,
        per_deposit_collected NUMERIC(12,2) NOT NULL,
        per_show_up NUMERIC(12,2) NOT NULL,
        target_bookings INT NOT NULL,
        bonus_amount NUMERIC(12,2) NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS marketing_users (
        name VARCHAR(255) PRIMARY KEY,
        role VARCHAR(50) NOT NULL,
        pin VARCHAR(100) NOT NULL,
        department VARCHAR(255) NOT NULL,
        bio TEXT,
        avatar_color VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'offline',
        last_active VARCHAR(100)
      );
    `);

    const rulesCount = await client.query('SELECT COUNT(*) FROM commission_rules');
    if (parseInt(rulesCount.rows[0].count) === 0) {
      await client.query(
        `INSERT INTO commission_rules
           (id, base_salary, per_booking, per_deposit_collected, per_show_up,
            target_bookings, bonus_amount,
            per_show_up_high, per_show_up_low, per_po_high, per_po_low, hourly_rate, po_threshold)
         VALUES ('default', 0, 0, 0, 0, 0, 0, $1, $2, $3, $4, $5, $6)`,
        [DEFAULT_RULES.perShowUpHigh, DEFAULT_RULES.perShowUpLow,
         DEFAULT_RULES.perPoHigh, DEFAULT_RULES.perPoLow,
         DEFAULT_RULES.hourlyRate, DEFAULT_RULES.poThreshold]
      );
    }

    const usersCount = await client.query('SELECT COUNT(*) FROM marketing_users');
    if (parseInt(usersCount.rows[0].count) === 0) {
      for (const u of DEFAULT_USERS) {
        await client.query(
          `INSERT INTO marketing_users (name, role, pin, department, bio, avatar_color, status, last_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [u.name, u.role, u.pin, u.department, u.bio, u.avatarColor, u.status, u.lastActive]
        );
      }
    }

    await client.query(`
      ALTER TABLE leads_reporting
        ADD COLUMN IF NOT EXISTS city VARCHAR(255),
        ADD COLUMN IF NOT EXISTS visit_cost NUMERIC(12,2) DEFAULT 2090
    `);

    await client.query(`
      ALTER TABLE marketing_users
        ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ
    `);

    await client.query(`
      ALTER TABLE commission_rules
        ADD COLUMN IF NOT EXISTS per_show_up_high NUMERIC(12,2) DEFAULT 350,
        ADD COLUMN IF NOT EXISTS per_show_up_low  NUMERIC(12,2) DEFAULT 200,
        ADD COLUMN IF NOT EXISTS per_po_high      NUMERIC(12,2) DEFAULT 150,
        ADD COLUMN IF NOT EXISTS per_po_low       NUMERIC(12,2) DEFAULT 100,
        ADD COLUMN IF NOT EXISTS hourly_rate      NUMERIC(12,2) DEFAULT 85,
        ADD COLUMN IF NOT EXISTS po_threshold     INT           DEFAULT 140
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS work_sessions (
        id               BIGSERIAL PRIMARY KEY,
        manager_name     VARCHAR(255) NOT NULL,
        started_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        ended_at         TIMESTAMPTZ,
        break_started_at TIMESTAMPTZ,
        total_break_secs INT NOT NULL DEFAULT 0
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_work_sessions_manager
        ON work_sessions(manager_name, started_at DESC)
    `);

    client.release();
    db.isConnected = true;
    db.status.configured = true;
    db.status.error = '';
    console.log('[DB] Tables bootstrapped successfully.');
  } catch (err: any) {
    db.isConnected = false;
    db.status.configured = false;
    db.status.error = `Connection failed: ${err.message}`;
    console.error('[DB] Bootstrap failed:', err);
  }
}
