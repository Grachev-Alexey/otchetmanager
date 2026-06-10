import { Router } from 'express';
import { db } from '../db';

const router = Router();

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

function dbRequired(res: any) {
  return res.status(503).json({ success: false, error: 'База данных недоступна' });
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ success: false, error: 'Слишком много попыток. Подождите минуту.' });
  }

  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ success: false, error: 'ПИН-код обязателен' });
  }
  if (!db.pool || !db.isConnected) return dbRequired(res);

  try {
    const result = await db.pool.query(
      'SELECT * FROM marketing_users WHERE pin = $1',
      [pin]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Неверный ПИН-код' });
    }

    const row = result.rows[0];
    const matchedUser = {
      id:         row.id ? Number(row.id) : undefined,
      name:       row.name,
      role:       row.role,
      department: row.department,
    };
    return res.json({ success: true, user: matchedUser });
  } catch (err: any) {
    console.error('[Auth] DB login error:', err);
    return res.status(500).json({ success: false, error: 'Ошибка базы данных' });
  }
});

export default router;
