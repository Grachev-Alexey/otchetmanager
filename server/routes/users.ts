import { Router } from 'express';
import { db } from '../db';
import { cache, TTL } from '../cache';

const router = Router();
const USERS_KEY = 'users:all';

function mapRow(row: any) {
  return {
    id:         row.id ? Number(row.id) : undefined,
    name:       row.name,
    role:       row.role,
    department: row.department,
    pin:        row.pin,
  };
}

function dbRequired(res: any) {
  return res.status(503).json({ error: 'База данных недоступна' });
}

// GET /api/users
router.get('/', async (req, res) => {
  if (!db.pool || !db.isConnected) return dbRequired(res);

  const cached = cache.get<ReturnType<typeof mapRow>[]>(USERS_KEY);
  if (cached) {
    if (req.headers['if-none-match'] === cached.etag) return res.status(304).end();
    res.setHeader('ETag', cached.etag);
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.json(cached.data);
  }

  try {
    const result = await db.pool.query('SELECT * FROM marketing_users ORDER BY name ASC');
    const data = result.rows.map(mapRow);
    const entry = cache.set(USERS_KEY, data, TTL.USERS);
    res.setHeader('ETag', entry.etag);
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.json(data);
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
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE marketing_users SET name = $1, role = $2, pin = $3, department = $4 WHERE id = $5`,
          [name, role, pin, dept, id]
        );
        if (originalName && originalName !== name) {
          await client.query(
            `UPDATE leads_reporting SET manager_name = $1 WHERE manager_name = $2`,
            [name, originalName]
          );
          await client.query(
            `UPDATE work_sessions SET manager_name = $1 WHERE manager_name = $2`,
            [name, originalName]
          );
          cache.del('leads:all');
        }
        await client.query('COMMIT');
      } catch (txErr) {
        await client.query('ROLLBACK');
        throw txErr;
      } finally {
        client.release();
      }
    } else {
      await db.pool.query(
        `INSERT INTO marketing_users (name, role, pin, department, bio, avatar_color)
         VALUES ($1, $2, $3, $4, '', 'from-indigo-500 to-purple-600')`,
        [name, role, pin, dept]
      );
    }
    cache.del(USERS_KEY);
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
    cache.del(USERS_KEY);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
