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

const hasPgUrl = !!process.env.DATABASE_URL;
const hasPgIndividual = !!(process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE);

if (hasPgUrl || hasPgIndividual) {
  try {
    const config = hasPgUrl
      ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 3000 }
      : {
          host: process.env.PGHOST,
          port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
          user: process.env.PGUSER,
          password: process.env.PGPASSWORD,
          database: process.env.PGDATABASE,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 3000,
        };
    db.pool = new pg.Pool(config as any);
    db.status.provider = 'postgres';
    db.status.connectionInfo = hasPgUrl
      ? process.env.DATABASE_URL!.split('@')[1] || 'PostgreSQL'
      : `${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}`;
  } catch (err: any) {
    db.status.error = err.message || 'Failed to initialize Postgres pool';
    console.error('[DB] Pool init error:', err);
  }
}

export async function bootstrapDb(): Promise<void> {
  if (!db.pool) return;
  try {
    const client = await db.pool.connect();
    console.log('[DB] Connected to PostgreSQL.');

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
        `INSERT INTO commission_rules (id, base_salary, per_booking, per_deposit_collected, per_show_up, target_bookings, bonus_amount)
         VALUES ('default', $1, $2, $3, $4, $5, $6)`,
        [DEFAULT_RULES.baseSalary, DEFAULT_RULES.perBooking, DEFAULT_RULES.perDepositCollected,
         DEFAULT_RULES.perShowUp, DEFAULT_RULES.targetBookings, DEFAULT_RULES.bonusAmount]
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
