import { Router } from 'express';
import { db } from '../db';
import { readLocalUsers, writeLocalUsers } from '../localFallback';

const router = Router();

// Online threshold: 3 minutes (heartbeat every 60s, so 3 missed beats = offline)
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
    name: row.name,
    role: row.role,
    pin: row.pin,
    department: row.department,
    bio: row.bio,
    avatarColor: row.avatar_color,
    status,
    lastActive: formatLastSeen(lastSeenAt),
  };
}

// GET /api/users
router.get('/', async (_req, res) => {
  if (db.pool && db.isConnected) {
    try {
      const result = await db.pool.query('SELECT * FROM marketing_users ORDER BY name ASC');
      return res.json(result.rows.map(mapRow));
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
  res.json(readLocalUsers());
});

// POST /api/users  (create or upsert)
router.post('/', async (req, res) => {
  const { name, role, pin, department, bio, avatarColor } = req.body;
  if (!name || !role || !pin) {
    return res.status(400).json({ error: 'ФИО, роль и ПИН-код обязательны' });
  }
  const dept = department || (role === 'admin' ? 'Администрация' : 'Отдел продаж');
  const color = avatarColor || 'from-indigo-500 to-purple-600';

  if (db.pool && db.isConnected) {
    try {
      await db.pool.query(`
        INSERT INTO marketing_users (name, role, pin, department, bio, avatar_color, status, last_active)
        VALUES ($1, $2, $3, $4, $5, $6, 'offline', 'Не в сети')
        ON CONFLICT (name) DO UPDATE SET
          role = EXCLUDED.role, pin = EXCLUDED.pin, department = EXCLUDED.department,
          bio = EXCLUDED.bio, avatar_color = EXCLUDED.avatar_color
      `, [name, role, pin, dept, bio || '', color]);
      return res.json({ success: true, name });
    } catch (err: any) {
      return res.status(500).json({ error: 'Database write error: ' + err.message });
    }
  }

  const users = readLocalUsers();
  const idx = users.findIndex((u: any) => u.name === name);
  const user = { name, role, pin, department: dept, bio: bio || '', avatarColor: color, status: 'offline', lastActive: 'Не в сети' };
  if (idx >= 0) users[idx] = { ...users[idx], ...user };
  else users.push(user);
  writeLocalUsers(users);
  res.json({ success: true, name });
});

// DELETE /api/users/:name
router.delete('/:name', async (req, res) => {
  const { name } = req.params;
  if (db.pool && db.isConnected) {
    try {
      await db.pool.query('DELETE FROM marketing_users WHERE name = $1', [name]);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
  writeLocalUsers(readLocalUsers().filter((u: any) => u.name !== name));
  res.json({ success: true });
});

export default router;
