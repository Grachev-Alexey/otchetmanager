import { Router } from 'express';
import { db } from '../db';

const router = Router();

function mapRow(row: any) {
  return {
    id: row.id ? Number(row.id) : undefined,
    name: row.name,
    role: row.role,
    pin: row.pin,
    department: row.department,
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
        `INSERT INTO marketing_users (name, role, pin, department, bio, avatar_color)
         VALUES ($1, $2, $3, $4, '', 'from-indigo-500 to-purple-600')`,
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
