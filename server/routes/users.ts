import { Router } from 'express';
import { db } from '../db';
import { readLocalUsers, writeLocalUsers } from '../localFallback';

const router = Router();

const mapRow = (row: any) => ({
  name: row.name, role: row.role, pin: row.pin,
  department: row.department, bio: row.bio,
  avatarColor: row.avatar_color,
  status: row.status, lastActive: row.last_active,
});

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
  const { name, role, pin, department, bio, avatarColor, status, lastActive } = req.body;
  if (!name || !role || !pin) {
    return res.status(400).json({ error: 'ФИО, роль и ПИН-код обязательны' });
  }
  const dept = department || (role === 'admin' ? 'Администрация' : 'Отдел продаж');
  const color = avatarColor || 'from-indigo-500 to-purple-600';

  if (db.pool && db.isConnected) {
    try {
      await db.pool.query(`
        INSERT INTO marketing_users (name, role, pin, department, bio, avatar_color, status, last_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (name) DO UPDATE SET
          role = EXCLUDED.role, pin = EXCLUDED.pin, department = EXCLUDED.department,
          bio = EXCLUDED.bio, avatar_color = EXCLUDED.avatar_color,
          status = EXCLUDED.status, last_active = EXCLUDED.last_active
      `, [name, role, pin, dept, bio || '', color, status || 'offline', lastActive || 'Не в сети']);
      return res.json({ success: true, name });
    } catch (err: any) {
      return res.status(500).json({ error: 'Database write error: ' + err.message });
    }
  }

  const users = readLocalUsers();
  const idx = users.findIndex((u: any) => u.name === name);
  const user = { name, role, pin, department: dept, bio: bio || '', avatarColor: color, status: status || 'offline', lastActive: lastActive || 'Не в сети' };
  if (idx >= 0) users[idx] = user;
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
