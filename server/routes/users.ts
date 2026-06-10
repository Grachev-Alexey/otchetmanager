import { Router } from 'express';
import { db } from '../db';

const router = Router();

const ONLINE_THRESHOLD_MS = 3 * 60 * 1000;

function deriveStatus(lastSeenAt: Date | null): 'online' | 'offline' {
  if (!lastSeenAt) return 'offline';
  return (Date.now() - lastSeenAt.getTime()) < ONLINE_THRESHOLD_MS ? 'online' : 'offline';
}

const MSK = 'Europe/Moscow';

function toMskTime(date: Date): string {
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: MSK });
}

function toMskDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: MSK });
}

function formatLastSeen(lastSeenAt: Date | null): string {
  if (!lastSeenAt) return 'Не в сети';
  const diffMs = Date.now() - lastSeenAt.getTime();
  if (diffMs < 0) return 'Не в сети';
  if (diffMs < ONLINE_THRESHOLD_MS) return 'В сети';
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin} мин назад`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `был(а) в ${toMskTime(lastSeenAt)} МСК`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return `вчера в ${toMskTime(lastSeenAt)} МСК`;
  if (diffD < 7) return `${diffD} дня назад в ${toMskTime(lastSeenAt)} МСК`;
  return `${toMskDate(lastSeenAt)} в ${toMskTime(lastSeenAt)} МСК`;
}

function mapRow(row: any) {
  const lastSeenAt: Date | null = row.last_seen_at ? new Date(row.last_seen_at) : null;
  const status = deriveStatus(lastSeenAt);
  return {
    id: row.id ? Number(row.id) : undefined,
    name: row.name,
    role: row.role,
    pin: row.pin,
    department: row.department,
    status,
    lastActive: formatLastSeen(lastSeenAt),
  };
}

function dbRequired(res: any) {
  return res.status(503).json({ error: 'База данных недоступна' });
}

// GET /api/users
router.get('/', async (_req, res) => {
  if (!db.pool || !db.isConnected) return dbRequired(res);
  try {
    const result = await db.pool.query('SELECT * FROM marketing_users ORDER BY name ASC');
    return res.json(result.rows.map(mapRow));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  const { id, name, role, pin, department, originalName } = req.body;
  if (!name || !role || !pin) {
    return res.status(400).json({ error: 'ФИО, роль и ПИН-код обязательны' });
  }
  if (!db.pool || !db.isConnected) return dbRequired(res);

  const dept = department || (role === 'admin' ? 'Администрация' : 'Отдел продаж');

  try {
    if (id) {
      await db.pool.query(
        `UPDATE marketing_users SET name = $1, role = $2, pin = $3, department = $4 WHERE id = $5`,
        [name, role, pin, dept, id]
      );
      if (originalName && originalName !== name) {
        await Promise.all([
          db.pool.query(
            `UPDATE leads_reporting SET manager_name = $1 WHERE manager_name = $2`,
            [name, originalName]
          ),
          db.pool.query(
            `UPDATE work_sessions SET manager_name = $1 WHERE manager_name = $2`,
            [name, originalName]
          ),
        ]);
      }
    } else {
      await db.pool.query(
        `INSERT INTO marketing_users (name, role, pin, department, bio, avatar_color, status, last_active)
         VALUES ($1, $2, $3, $4, '', 'from-indigo-500 to-purple-600', 'offline', 'Не в сети')`,
        [name, role, pin, dept]
      );
    }
    return res.json({ success: true, name });
  } catch (err: any) {
    return res.status(500).json({ error: 'Database write error: ' + err.message });
  }
});

// DELETE /api/users/:name
router.delete('/:name', async (req, res) => {
  const { name } = req.params;
  if (!db.pool || !db.isConnected) return dbRequired(res);
  try {
    await db.pool.query('DELETE FROM marketing_users WHERE name = $1', [name]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
