import express from 'express';
import path from 'path';
import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Set up local fallback directory
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const RULES_FILE = path.join(DATA_DIR, 'rules.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Default initial users
const DEFAULT_USERS = [
  { 
    name: "Александр Г.", 
    role: "admin", 
    pin: "1111", 
    department: "Руководитель", 
    bio: "Управление KPI, структурой и бюджетом", 
    avatarColor: "from-indigo-500 to-indigo-650", 
    status: "online", 
    lastActive: "В сети" 
  },
  { 
    name: "Мария С.", 
    role: "admin", 
    pin: "2222", 
    department: "Тех. Администратор", 
    bio: "Аудит и верификация AmoCRM статусов", 
    avatarColor: "from-purple-500 to-pink-500", 
    status: "online", 
    lastActive: "10 мин назад" 
  },
  { 
    name: "Алина К.", 
    role: "manager", 
    pin: "3333", 
    department: "Старший лид-менеджер", 
    bio: "Специалист по работе с клиентами повышенной категории", 
    avatarColor: "from-emerald-400 to-teal-500", 
    status: "online", 
    lastActive: "В сети" 
  },
  { 
    name: "Иван П.", 
    role: "manager", 
    pin: "4444", 
    department: "Лид-менеджер", 
    bio: "Фокус на закрытии предоплат и визитов", 
    avatarColor: "from-blue-500 to-indigo-500", 
    status: "offline", 
    lastActive: "1 час назад" 
  },
  { 
    name: "Маргарита Д.", 
    role: "manager", 
    pin: "5555", 
    department: "Лид-менеджер", 
    bio: "Работа с повторными контактами и холодным трафиком", 
    avatarColor: "from-amber-450 to-orange-500", 
    status: "online", 
    lastActive: "3 мин назад" 
  },
  { 
    name: "Сергей В.", 
    role: "manager", 
    pin: "6666", 
    department: "Лид-менеджер", 
    bio: "Ведение сделок со сложными условиями финансирования", 
    avatarColor: "from-cyan-455 to-blue-500", 
    status: "online", 
    lastActive: "В сети" 
  }
];

// Initialize local files with default empty states if missing
if (!fs.existsSync(LEADS_FILE)) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(RULES_FILE)) {
  const defaultRules = {
    baseSalary: 40000,
    perBooking: 1000,
    perDepositCollected: 1500,
    perShowUp: 2000,
    targetBookings: 15,
    bonusAmount: 10000
  };
  fs.writeFileSync(RULES_FILE, JSON.stringify(defaultRules, null, 2), 'utf-8');
}
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), 'utf-8');
}

// PostgreSQL setup
let pool: pg.Pool | null = null;
let isDbConnected = false;
let dbStatus = {
  provider: 'local',
  configured: false,
  error: '',
  tableName: 'leads_reporting',
  connectionInfo: ''
};

const hasPgUrl = !!process.env.DATABASE_URL;
const hasPgIndividual = !!(process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE);

if (hasPgUrl || hasPgIndividual) {
  try {
    const config = hasPgUrl 
      ? { 
          connectionString: process.env.DATABASE_URL, 
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 3000
        }
      : {
          host: process.env.PGHOST,
          port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
          user: process.env.PGUSER,
          password: process.env.PGPASSWORD,
          database: process.env.PGDATABASE,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 3000
        };

    pool = new pg.Pool(config);
    dbStatus.provider = 'postgres';
    dbStatus.connectionInfo = hasPgUrl 
      ? process.env.DATABASE_URL!.split('@')[1] || 'PostgreSQL'
      : `${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}`;
  } catch (err: any) {
    dbStatus.configured = false;
    dbStatus.error = err.message || 'Failed to initialize Postgres pool';
    console.error('PostgreSQL configuration error:', err);
  }
}

// Initialize tables if Database is present
async function bootstrapDb() {
  if (!pool) return;
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL successfully.');

    // Create reported leads table
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create rules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS commission_rules (
        id VARCHAR(50) PRIMARY KEY,
        base_salary NUMERIC(12,2) NOT NULL,
        per_booking NUMERIC(12,2) NOT NULL,
        per_deposit_collected NUMERIC(12,2) NOT NULL,
        per_show_up NUMERIC(12,2) NOT NULL,
        target_bookings INT NOT NULL,
        bonus_amount NUMERIC(12,2) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create users table
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

    // Insert default rules if not exists
    const rulesCheck = await client.query('SELECT COUNT(*) FROM commission_rules');
    if (parseInt(rulesCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO commission_rules (id, base_salary, per_booking, per_deposit_collected, per_show_up, target_bookings, bonus_amount)
        VALUES ('default', 40000, 1000, 1500, 2000, 15, 10000)
      `);
    }

    // Insert default users if not exists
    const usersCheck = await client.query('SELECT COUNT(*) FROM marketing_users');
    if (parseInt(usersCheck.rows[0].count) === 0) {
      for (const u of DEFAULT_USERS) {
        await client.query(`
          INSERT INTO marketing_users (name, role, pin, department, bio, avatar_color, status, last_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [u.name, u.role, u.pin, u.department, u.bio, u.avatarColor, u.status, u.lastActive]);
      }
    }

    client.release();
    isDbConnected = true;
    dbStatus.configured = true;
    dbStatus.error = '';
    console.log('PostgreSQL reporting tables bootstrapped.');
  } catch (err: any) {
    isDbConnected = false;
    dbStatus.configured = false;
    dbStatus.error = `Database connection failed: ${err.message}`;
    console.error('Failed to bootstrap PostgreSQL database:', err);
  }
}

// Start database bootstrap in background
bootstrapDb();

// Helper to write/read local files
function readLocalLeads() {
  try { return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8')); } catch (err) { return []; }
}
function writeLocalLeads(data: any) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}
function readLocalRules() {
  try { return JSON.parse(fs.readFileSync(RULES_FILE, 'utf-8')); } catch (err) { return DEFAULT_USERS; }
}
function writeLocalRules(rules: any) {
  fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2), 'utf-8');
}
function readLocalUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8')); } catch (err) { return DEFAULT_USERS; }
}
function writeLocalUsers(users: any) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

// REST APIs
app.get('/api/db-status', async (req, res) => {
  if (pool && !isDbConnected) {
    await bootstrapDb();
  }
  res.json({
    provider: (pool && isDbConnected) ? 'postgres' : 'local',
    configured: pool && isDbConnected,
    error: dbStatus.error,
    connectionInfo: dbStatus.connectionInfo,
    tableName: dbStatus.tableName,
    geminiActive: false
  });
});

// GET all users
app.get('/api/users', async (req, res) => {
  if (pool && isDbConnected) {
    try {
      const result = await pool.query('SELECT * FROM marketing_users ORDER BY name ASC');
      const mapped = result.rows.map(row => ({
        name: row.name,
        role: row.role,
        pin: row.pin,
        department: row.department,
        bio: row.bio,
        avatarColor: row.avatar_color,
        status: row.status,
        lastActive: row.last_active
      }));
      res.json(mapped);
    } catch (err: any) {
      res.status(500).json({ error: 'DB query error: ' + err.message });
    }
  } else {
    res.json(readLocalUsers());
  }
});

// SAVE or Update user
app.post('/api/users', async (req, res) => {
  const { name, role, pin, department, bio, avatarColor, status, lastActive } = req.body;
  if (!name || !role || !pin) {
    return res.status(400).json({ error: 'Имя, роль и пин-код обязательны' });
  }

  const finalAvatar = avatarColor || 'from-indigo-500 to-purple-600';
  const finalDept = department || (role === 'admin' ? 'Администрация' : 'Отдел продаж');

  if (pool && isDbConnected) {
    try {
      await pool.query(`
        INSERT INTO marketing_users (name, role, pin, department, bio, avatar_color, status, last_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (name) DO UPDATE SET
          role = EXCLUDED.role,
          pin = EXCLUDED.pin,
          department = EXCLUDED.department,
          bio = EXCLUDED.bio,
          avatar_color = EXCLUDED.avatar_color,
          status = EXCLUDED.status,
          last_active = EXCLUDED.last_active
      `, [name, role, pin, finalDept, bio || '', finalAvatar, status || 'offline', lastActive || 'Не в сети']);
      res.json({ success: true, name });
    } catch (err: any) {
      res.status(500).json({ error: 'Postgres user save failed: ' + err.message });
    }
  } else {
    const users = readLocalUsers();
    const existingIdx = users.findIndex((u: any) => u.name === name);
    const updatedUser = {
      name,
      role,
      pin,
      department: finalDept,
      bio: bio || '',
      avatarColor: finalAvatar,
      status: status || 'offline',
      lastActive: lastActive || 'Не в сети'
    };

    if (existingIdx >= 0) {
      users[existingIdx] = updatedUser;
    } else {
      users.push(updatedUser);
    }
    writeLocalUsers(users);
    res.json({ success: true, name });
  }
});

// DELETE User
app.delete('/api/users/:name', async (req, res) => {
  const { name } = req.params;
  if (pool && isDbConnected) {
    try {
      await pool.query('DELETE FROM marketing_users WHERE name = $1', [name]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const users = readLocalUsers();
    const filtered = users.filter((u: any) => u.name !== name);
    writeLocalUsers(filtered);
    res.json({ success: true });
  }
});

// LOGIN WITH PIN
app.post('/api/auth/login', async (req, res) => {
  const { name, pin } = req.body;
  if (!pin) {
    return res.status(400).json({ error: 'ПИН-код обязателен' });
  }

  let matchedUser: any = null;
  if (pool && isDbConnected) {
    try {
      let query = '';
      let params = [];
      if (name) {
        query = 'SELECT * FROM marketing_users WHERE name = $1 AND pin = $2';
        params = [name, pin];
      } else {
        query = 'SELECT * FROM marketing_users WHERE pin = $1';
        params = [pin];
      }
      const result = await pool.query(query, params);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        matchedUser = {
          name: row.name,
          role: row.role,
          pin: row.pin,
          department: row.department,
          bio: row.bio,
          avatarColor: row.avatar_color,
          status: 'online',
          lastActive: 'В сети'
        };

        // Update online status in postgres
        await pool.query('UPDATE marketing_users SET status = $1, last_active = $2 WHERE name = $3', ['online', 'В сети', row.name]);
      }
    } catch (err: any) {
      console.error('Login database matching error:', err);
    }
  }

  // Fallback if not found in Postgres or not connected
  if (!matchedUser) {
    const users = readLocalUsers();
    if (name) {
      matchedUser = users.find((u: any) => u.name === name && u.pin === pin);
    } else {
      matchedUser = users.find((u: any) => u.pin === pin);
    }

    if (matchedUser) {
      // Update status in local fallback
      const uIdx = users.findIndex((u: any) => u.name === matchedUser.name);
      if (uIdx >= 0) {
        users[uIdx].status = 'online';
        users[uIdx].lastActive = 'В сети';
        writeLocalUsers(users);
      }
    }
  }

  if (matchedUser) {
    res.json({ success: true, user: matchedUser });
  } else {
    res.status(401).json({ success: false, error: 'Введен неверный ПИН-код' });
  }
});

// LOGOUT route
app.post('/api/auth/logout', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.json({ success: true });

  const lastActiveText = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' назад';

  if (pool && isDbConnected) {
    try {
      await pool.query('UPDATE marketing_users SET status = $1, last_active = $2 WHERE name = $3', ['offline', lastActiveText, name]);
    } catch (err) {
      console.error('Failed to update logout status:', err);
    }
  } else {
    const users = readLocalUsers();
    const uIdx = users.findIndex((u: any) => u.name === name);
    if (uIdx >= 0) {
      users[uIdx].status = 'offline';
      users[uIdx].lastActive = lastActiveText;
      writeLocalUsers(users);
    }
  }
  res.json({ success: true });
});

// GET leads reports
app.get('/api/leads', async (req, res) => {
  if (pool && isDbConnected) {
    try {
      const result = await pool.query('SELECT * FROM leads_reporting ORDER BY booking_date DESC, created_at DESC');
      const mapped = result.rows.map(row => ({
        id: row.id,
        managerName: row.manager_name,
        clientName: row.client_name,
        clientPhone: row.client_phone,
        amocrmLeadId: row.amocrm_lead_id,
        bookingDate: row.booking_date,
        status: row.status,
        depositRequired: row.deposit_required,
        depositAmount: parseFloat(row.deposit_amount),
        depositPaid: row.deposit_paid,
        comments: row.comments,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
      res.json(mapped);
    } catch (err: any) {
      res.status(500).json({ error: 'Database query error: ' + err.message });
    }
  } else {
    res.json(readLocalLeads());
  }
});

// Post a new lead
app.post('/api/leads', async (req, res) => {
  const {
    id,
    managerName,
    clientName,
    clientPhone,
    amocrmLeadId,
    bookingDate,
    status,
    depositRequired,
    depositAmount,
    depositPaid,
    comments
  } = req.body;

  if (!managerName || !clientName || !bookingDate || !status) {
    return res.status(400).json({ error: 'Missing required field' });
  }

  const payloadId = id || `lead-${Date.now()}`;
  const now = new Date().toISOString();

  if (pool && isDbConnected) {
    try {
      await pool.query(`
        INSERT INTO leads_reporting (
          id, manager_name, client_name, client_phone, amocrm_lead_id, booking_date, status, deposit_required, deposit_amount, deposit_paid, comments, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          manager_name = EXCLUDED.manager_name,
          client_name = EXCLUDED.client_name,
          client_phone = EXCLUDED.client_phone,
          amocrm_lead_id = EXCLUDED.amocrm_lead_id,
          booking_date = EXCLUDED.booking_date,
          status = EXCLUDED.status,
          deposit_required = EXCLUDED.deposit_required,
          deposit_amount = EXCLUDED.deposit_amount,
          deposit_paid = EXCLUDED.deposit_paid,
          comments = EXCLUDED.comments,
          updated_at = EXCLUDED.updated_at
      `, [
        payloadId,
        managerName,
        clientName,
        clientPhone || '',
        amocrmLeadId || '',
        bookingDate,
        status,
        !!depositRequired,
        depositAmount || 0,
        !!depositPaid,
        comments || '',
        now,
        now
      ]);
      res.status(200).json({ id: payloadId, success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to write in postgres database: ' + err.message });
    }
  } else {
    try {
      const leads = readLocalLeads();
      const existingIndex = leads.findIndex((l: any) => l.id === payloadId);
      const record = {
        id: payloadId,
        managerName,
        clientName,
        clientPhone: clientPhone || '',
        amocrmLeadId: amocrmLeadId || '',
        bookingDate,
        status,
        depositRequired: !!depositRequired,
        depositAmount: depositAmount || 0,
        depositPaid: !!depositPaid,
        comments: comments || '',
        createdAt: existingIndex >= 0 ? leads[existingIndex].createdAt : now,
        updatedAt: now
      };

      if (existingIndex >= 0) {
        leads[existingIndex] = record;
      } else {
        leads.push(record);
      }

      writeLocalLeads(leads);
      res.json({ id: payloadId, success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to save to local file' });
    }
  }
});

// Delete lead
app.delete('/api/leads/:id', async (req, res) => {
  const { id } = req.params;
  if (pool && isDbConnected) {
    try {
      await pool.query('DELETE FROM leads_reporting WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const leads = readLocalLeads();
    const filtered = leads.filter((l: any) => l.id !== id);
    writeLocalLeads(filtered);
    res.json({ success: true });
  }
});

// Rules end-points
app.get('/api/rules', async (req, res) => {
  if (pool && isDbConnected) {
    try {
      const result = await pool.query('SELECT * FROM commission_rules WHERE id = $1', ['default']);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        res.json({
          baseSalary: parseFloat(row.base_salary),
          perBooking: parseFloat(row.per_booking),
          perDepositCollected: parseFloat(row.per_deposit_collected),
          perShowUp: parseFloat(row.per_show_up),
          targetBookings: parseInt(row.target_bookings),
          bonusAmount: parseFloat(row.bonus_amount)
        });
      } else {
        res.json(readLocalRules());
      }
    } catch (err) {
      res.json(readLocalRules());
    }
  } else {
    res.json(readLocalRules());
  }
});

app.post('/api/rules', async (req, res) => {
  const { baseSalary, perBooking, perDepositCollected, perShowUp, targetBookings, bonusAmount } = req.body;
  if (pool && isDbConnected) {
    try {
      await pool.query(`
        INSERT INTO commission_rules (id, base_salary, per_booking, per_deposit_collected, per_show_up, target_bookings, bonus_amount)
        VALUES ('default', $1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          base_salary = EXCLUDED.base_salary,
          per_booking = EXCLUDED.per_booking,
          per_deposit_collected = EXCLUDED.per_deposit_collected,
          per_show_up = EXCLUDED.per_show_up,
          target_bookings = EXCLUDED.target_bookings,
          bonus_amount = EXCLUDED.bonus_amount,
          updated_at = CURRENT_TIMESTAMP
      `, [baseSalary, perBooking, perDepositCollected, perShowUp, targetBookings, bonusAmount]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Postgres rule save failed: ' + err.message });
    }
  } else {
    writeLocalRules({ baseSalary, perBooking, perDepositCollected, perShowUp, targetBookings, bonusAmount });
    res.json({ success: true });
  }
});

// Start Express + Vite Dev or Static Production build server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
