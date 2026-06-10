import { Router } from 'express';
import { db } from '../db';
import { readLocalUsers, writeLocalUsers } from '../localFallback';

const router = Router();

// In-memory rate limiter: max 10 attempts per IP per minute
const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ success: false, error: 'Слишком много попыток. Подождите минуту.' });
  }

  const { name, pin } = req.body;
  if (!pin) {
    return res.status(400).json({ success: false, error: 'ПИН-код обязателен' });
  }

  let matchedUser: any = null;

  if (db.pool && db.isConnected) {
    try {
      const query = name
        ? 'SELECT * FROM marketing_users WHERE name = $1 AND pin = $2'
        : 'SELECT * FROM marketing_users WHERE pin = $1';
      const params = name ? [name, pin] : [pin];
      const result = await db.pool.query(query, params);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        matchedUser = {
          id: row.id ? Number(row.id) : undefined,
          name: row.name, role: row.role, pin: row.pin,
          department: row.department, status: 'online', lastActive: 'В сети',
        };
        await db.pool.query(
          'UPDATE marketing_users SET status = $1, last_active = $2, last_seen_at = NOW() WHERE name = $3',
          ['online', 'В сети', row.name]
        );
      }
    } catch (err) {
      console.error('[Auth] DB login error:', err);
    }
  }

  if (!matchedUser) {
    const users = readLocalUsers();
    matchedUser = name
      ? users.find((u: any) => u.name === name && u.pin === pin)
      : users.find((u: any) => u.pin === pin);

    if (matchedUser) {
      const idx = users.findIndex((u: any) => u.name === matchedUser.name);
      if (idx >= 0) {
        users[idx].status = 'online';
        users[idx].lastActive = 'В сети';
        users[idx].lastSeenAt = new Date().toISOString();
        writeLocalUsers(users);
      }
    }
  }

  if (matchedUser) {
    return res.json({ success: true, user: matchedUser });
  }
  res.status(401).json({ success: false, error: 'Неверный ПИН-код' });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.json({ success: true });

  if (db.pool && db.isConnected) {
    try {
      // NULL last_seen_at → deriveStatus returns 'offline' immediately
      await db.pool.query(
        `UPDATE marketing_users
         SET status = 'offline', last_active = $1, last_seen_at = NULL
         WHERE name = $2`,
        [new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + ' назад', name]
      );
    } catch (err) {
      console.error('[Auth] DB logout error:', err);
    }
  } else {
    const users = readLocalUsers();
    const idx = users.findIndex((u: any) => u.name === name);
    if (idx >= 0) {
      users[idx].status = 'offline';
      users[idx].lastSeenAt = null;
      writeLocalUsers(users);
    }
  }
  res.json({ success: true });
});

// POST /api/auth/heartbeat  — called every ~60s by the client while active
router.post('/heartbeat', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false });

  if (db.pool && db.isConnected) {
    try {
      await db.pool.query(
        `UPDATE marketing_users SET last_seen_at = NOW(), status = 'online', last_active = 'В сети' WHERE name = $1`,
        [name]
      );
    } catch (err) {
      console.error('[Auth] Heartbeat error:', err);
    }
  } else {
    const users = readLocalUsers();
    const idx = users.findIndex((u: any) => u.name === name);
    if (idx >= 0) {
      users[idx].status = 'online';
      users[idx].lastSeenAt = new Date().toISOString();
      writeLocalUsers(users);
    }
  }
  res.json({ success: true });
});

export default router;
