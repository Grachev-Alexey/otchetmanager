import { Router } from 'express';
import { db } from '../db';

const router = Router();

// Each session is capped at MAX_SESSION_SECS (16h) to prevent runaway
// data from forgotten open sessions.
const MAX_SESSION_SECS = 16 * 3600;

function sessionView(row: any) {
  return {
    id:             row.id,
    managerName:    row.manager_name,
    startedAt:      row.started_at,
    endedAt:        row.ended_at || null,
    breakStartedAt: row.break_started_at || null,
    totalBreakSecs: row.total_break_secs,
  };
}

// SQL fragment: completed seconds for sessions started today (Moscow time).
// Only counts sessions with ended_at IS NOT NULL — open/stale sessions are excluded.
const TODAY_PRIOR_SQL = `
  SELECT COALESCE(SUM(
    LEAST(GREATEST(0,
      EXTRACT(EPOCH FROM (ended_at - started_at))::INT - total_break_secs
    ), $2)
  ), 0) AS prior_secs
  FROM work_sessions
  WHERE manager_name = $1
    AND ended_at IS NOT NULL
    AND (started_at AT TIME ZONE 'Europe/Moscow')::DATE
        = (NOW() AT TIME ZONE 'Europe/Moscow')::DATE
`;

// Close stale open sessions from PREVIOUS days with zero duration
// so they don't pollute today's stats.
const CLOSE_STALE_PREV_DAYS_SQL = `
  UPDATE work_sessions
  SET ended_at = started_at
  WHERE manager_name = $1
    AND ended_at IS NULL
    AND (started_at AT TIME ZONE 'Europe/Moscow')::DATE
        < (NOW() AT TIME ZONE 'Europe/Moscow')::DATE
`;

// ── GET /api/shifts/active?name=X ──────────────────────────────────────────
// Returns active session (only if started TODAY) + today's prior completed seconds.
// Also returns server-computed elapsed seconds to avoid client/server clock skew.
router.get('/active', async (req, res) => {
  const { name } = req.query;
  if (!name || typeof name !== 'string')
    return res.status(400).json({ error: 'name required' });

  if (!db.pool || !db.isConnected)
    return res.json({ active: false, session: null, todayPriorSeconds: 0, sessionElapsedSeconds: 0, breakElapsedSeconds: 0 });

  try {
    await db.pool.query(CLOSE_STALE_PREV_DAYS_SQL, [name]);

    const [activeR, priorR] = await Promise.all([
      db.pool.query(
        `SELECT *,
           GREATEST(0,
             EXTRACT(EPOCH FROM (NOW() - started_at))::INT
             - total_break_secs
             - CASE WHEN break_started_at IS NOT NULL
                    THEN GREATEST(0, EXTRACT(EPOCH FROM (NOW() - break_started_at))::INT)
                    ELSE 0 END
           ) AS session_elapsed_secs,
           CASE WHEN break_started_at IS NOT NULL
                THEN GREATEST(0, EXTRACT(EPOCH FROM (NOW() - break_started_at))::INT)
                ELSE 0 END AS break_elapsed_secs
         FROM work_sessions
         WHERE manager_name = $1
           AND ended_at IS NULL
           AND (started_at AT TIME ZONE 'Europe/Moscow')::DATE
               = (NOW() AT TIME ZONE 'Europe/Moscow')::DATE
         ORDER BY started_at DESC LIMIT 1`,
        [name]
      ),
      db.pool.query(TODAY_PRIOR_SQL, [name, MAX_SESSION_SECS]),
    ]);

    const todayPriorSeconds = parseInt(priorR.rows[0].prior_secs);

    if (activeR.rows.length === 0)
      return res.json({ active: false, session: null, todayPriorSeconds, sessionElapsedSeconds: 0, breakElapsedSeconds: 0 });

    const row = activeR.rows[0];
    return res.json({
      active: true,
      session: sessionView(row),
      todayPriorSeconds,
      sessionElapsedSeconds: parseInt(row.session_elapsed_secs) || 0,
      breakElapsedSeconds:   parseInt(row.break_elapsed_secs)   || 0,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/shifts/start ─────────────────────────────────────────────────
// ONE session per manager per calendar day (Moscow time).
// If a completed session exists for today, it is REOPENED by absorbing the
// pause duration into total_break_secs — no new row is created.
router.post('/start', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  if (!db.pool || !db.isConnected)
    return res.status(503).json({ error: 'База данных недоступна' });

  try {
    // 1. Close stale sessions from previous days (zero duration — don't count).
    await db.pool.query(CLOSE_STALE_PREV_DAYS_SQL, [name]);

    // 2. Close any stale OPEN session from today with zero duration.
    //    (todayPriorSeconds is calculated BEFORE this so they're never counted.)
    await db.pool.query(
      `UPDATE work_sessions SET ended_at = started_at
       WHERE manager_name = $1 AND ended_at IS NULL`,
      [name]
    );

    // 3. Try to REOPEN the last real completed session from today.
    //    Absorb the pause (ended_at → now) into total_break_secs so the
    //    client timer stays accurate: elapsed = now − started_at − total_break_secs.
    const reopenR = await db.pool.query(
      `UPDATE work_sessions
       SET ended_at      = NULL,
           break_started_at = NULL,
           total_break_secs = total_break_secs
             + GREATEST(0, EXTRACT(EPOCH FROM (NOW() - ended_at))::INT)
       WHERE id = (
         SELECT id FROM work_sessions
         WHERE manager_name = $1
           AND ended_at IS NOT NULL
           AND ended_at > started_at
           AND (started_at AT TIME ZONE 'Europe/Moscow')::DATE
               = (NOW() AT TIME ZONE 'Europe/Moscow')::DATE
         ORDER BY started_at DESC LIMIT 1
       )
       RETURNING *`,
      [name]
    );

    if (reopenR.rows.length > 0) {
      const priorR = await db.pool.query(TODAY_PRIOR_SQL, [name, MAX_SESSION_SECS]);
      const todayPriorSeconds = parseInt(priorR.rows[0].prior_secs);
      // Compute elapsed server-side to avoid clock skew on client
      const elapsedR = await db.pool.query(
        `SELECT GREATEST(0, EXTRACT(EPOCH FROM (NOW() - started_at))::INT - total_break_secs) AS secs
         FROM work_sessions WHERE id = $1`,
        [reopenR.rows[0].id]
      );
      const sessionElapsedSeconds = parseInt(elapsedR.rows[0]?.secs) || 0;
      return res.json({ success: true, session: sessionView(reopenR.rows[0]), todayPriorSeconds, sessionElapsedSeconds });
    }

    // 4. No session to reopen — first start of the day, create new row.
    const priorR = await db.pool.query(TODAY_PRIOR_SQL, [name, MAX_SESSION_SECS]);
    const todayPriorSeconds = parseInt(priorR.rows[0].prior_secs);
    const r = await db.pool.query(
      `INSERT INTO work_sessions (manager_name, started_at)
       VALUES ($1, NOW()) RETURNING *`,
      [name]
    );
    // Brand new session — elapsed is 0 by definition
    return res.json({ success: true, session: sessionView(r.rows[0]), todayPriorSeconds, sessionElapsedSeconds: 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/shifts/end ───────────────────────────────────────────────────
router.post('/end', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  if (!db.pool || !db.isConnected)
    return res.status(503).json({ error: 'База данных недоступна' });

  try {
    // If currently on break, close it first.
    await db.pool.query(
      `UPDATE work_sessions
       SET total_break_secs = total_break_secs +
             EXTRACT(EPOCH FROM (NOW() - break_started_at))::INT,
           break_started_at = NULL
       WHERE manager_name = $1 AND ended_at IS NULL
         AND break_started_at IS NOT NULL`,
      [name]
    );
    const r = await db.pool.query(
      `UPDATE work_sessions
       SET ended_at = NOW()
       WHERE manager_name = $1 AND ended_at IS NULL
       RETURNING EXTRACT(EPOCH FROM (ended_at - started_at))::INT - total_break_secs AS worked_secs`,
      [name]
    );
    const workedSeconds = r.rows[0]?.worked_secs ?? 0;
    return res.json({ success: true, workedSeconds: Math.max(0, workedSeconds) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/shifts/break/start ───────────────────────────────────────────
router.post('/break/start', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  if (!db.pool || !db.isConnected)
    return res.status(503).json({ error: 'База данных недоступна' });

  try {
    await db.pool.query(
      `UPDATE work_sessions
       SET break_started_at = NOW()
       WHERE manager_name = $1 AND ended_at IS NULL
         AND break_started_at IS NULL`,
      [name]
    );
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/shifts/break/end ─────────────────────────────────────────────
router.post('/break/end', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  if (!db.pool || !db.isConnected)
    return res.status(503).json({ error: 'База данных недоступна' });

  try {
    await db.pool.query(
      `UPDATE work_sessions
       SET total_break_secs = total_break_secs +
             EXTRACT(EPOCH FROM (NOW() - break_started_at))::INT,
           break_started_at = NULL
       WHERE manager_name = $1 AND ended_at IS NULL
         AND break_started_at IS NOT NULL`,
      [name]
    );
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/shifts/monthly?name=X&year=YYYY&month=MM ─────────────────────
router.get('/monthly', async (req, res) => {
  const { name, year, month } = req.query;
  if (!name || !year || !month)
    return res.status(400).json({ error: 'name, year, month required' });

  if (!db.pool || !db.isConnected)
    return res.status(503).json({ error: 'База данных недоступна' });

  try {
    const r = await db.pool.query(
      `SELECT COALESCE(SUM(
         LEAST(
           GREATEST(0,
             EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))::INT
             - total_break_secs
             - CASE WHEN break_started_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (NOW() - break_started_at))::INT
                    ELSE 0 END
           ),
           $4
         )
       ), 0) AS total_secs
       FROM work_sessions
       WHERE manager_name = $1
         AND started_at >= (make_date($2::int, $3::int, 1) AT TIME ZONE 'Europe/Moscow')
         AND started_at <  (make_date($2::int, $3::int, 1) AT TIME ZONE 'Europe/Moscow') + INTERVAL '1 month'`,
      [name, parseInt(year as string), parseInt(month as string), MAX_SESSION_SECS]
    );
    return res.json({ totalSeconds: parseInt(r.rows[0].total_secs) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/shifts/monthly-all?year=YYYY&month=MM ────────────────────────
router.get('/monthly-all', async (req, res) => {
  const { year, month } = req.query;
  if (!year || !month)
    return res.status(400).json({ error: 'year, month required' });

  if (!db.pool || !db.isConnected)
    return res.status(503).json({ error: 'База данных недоступна' });

  try {
    const r = await db.pool.query(
      `SELECT manager_name,
         COALESCE(SUM(
           LEAST(
             GREATEST(0,
               EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))::INT
               - total_break_secs
               - CASE WHEN break_started_at IS NOT NULL
                      THEN EXTRACT(EPOCH FROM (NOW() - break_started_at))::INT
                      ELSE 0 END
             ),
             $3
           )
         ), 0) AS total_secs
       FROM work_sessions
       WHERE started_at >= (make_date($1::int, $2::int, 1) AT TIME ZONE 'Europe/Moscow')
         AND started_at <  (make_date($1::int, $2::int, 1) AT TIME ZONE 'Europe/Moscow') + INTERVAL '1 month'
       GROUP BY manager_name`,
      [parseInt(year as string), parseInt(month as string), MAX_SESSION_SECS]
    );
    const result: Record<string, number> = {};
    for (const row of r.rows) {
      result[row.manager_name] = parseInt(row.total_secs);
    }
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/shifts/admin/sessions?date=YYYY-MM-DD ────────────────────────
// Returns all sessions for a given calendar day (Moscow time).
router.get('/admin/sessions', async (req, res) => {
  const { date } = req.query;
  if (!db.pool || !db.isConnected)
    return res.status(503).json({ error: 'База данных недоступна' });

  try {
    const dateStr = typeof date === 'string' && date
      ? date
      : new Date().toLocaleDateString('sv', { timeZone: 'Europe/Moscow' });

    const r = await db.pool.query(
      `SELECT * FROM work_sessions
       WHERE (started_at AT TIME ZONE 'Europe/Moscow')::DATE = $1::DATE
       ORDER BY manager_name ASC, started_at ASC`,
      [dateStr]
    );
    return res.json(r.rows.map(sessionView));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/shifts/admin/sessions ──────────────────────────────────────
// Manually create a completed session.
router.post('/admin/sessions', async (req, res) => {
  const { managerName, startedAt, endedAt, totalBreakSecs } = req.body;
  if (!managerName || !startedAt)
    return res.status(400).json({ error: 'managerName and startedAt required' });
  if (!db.pool || !db.isConnected)
    return res.status(503).json({ error: 'База данных недоступна' });

  try {
    const r = await db.pool.query(
      `INSERT INTO work_sessions (manager_name, started_at, ended_at, total_break_secs)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [managerName, startedAt, endedAt || null, totalBreakSecs || 0]
    );
    return res.json(sessionView(r.rows[0]));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/shifts/admin/sessions/:id ─────────────────────────────────
// Edit a session's times.
router.patch('/admin/sessions/:id', async (req, res) => {
  const { id } = req.params;
  const { startedAt, endedAt, totalBreakSecs } = req.body;
  if (!db.pool || !db.isConnected)
    return res.status(503).json({ error: 'База данных недоступна' });

  try {
    const sets: string[] = [];
    const vals: any[] = [];
    if (startedAt !== undefined)     { vals.push(startedAt);     sets.push(`started_at = $${vals.length}`); }
    if (endedAt !== undefined)       { vals.push(endedAt || null); sets.push(`ended_at = $${vals.length}`); }
    if (totalBreakSecs !== undefined){ vals.push(totalBreakSecs); sets.push(`total_break_secs = $${vals.length}`); }
    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
    vals.push(id);
    const r = await db.pool.query(
      `UPDATE work_sessions SET ${sets.join(', ')}, break_started_at = NULL WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    return res.json(sessionView(r.rows[0]));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/shifts/admin/sessions/:id ────────────────────────────────
router.delete('/admin/sessions/:id', async (req, res) => {
  const { id } = req.params;
  if (!db.pool || !db.isConnected)
    return res.status(503).json({ error: 'База данных недоступна' });

  try {
    await db.pool.query('DELETE FROM work_sessions WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/shifts/admin/close/:id ─────────────────────────────────────
// Force-close an open session right now.
router.post('/admin/close/:id', async (req, res) => {
  const { id } = req.params;
  if (!db.pool || !db.isConnected)
    return res.status(503).json({ error: 'База данных недоступна' });

  try {
    const r = await db.pool.query(
      `UPDATE work_sessions
       SET ended_at = NOW(),
           total_break_secs = total_break_secs +
             CASE WHEN break_started_at IS NOT NULL
               THEN EXTRACT(EPOCH FROM (NOW() - break_started_at))::INT ELSE 0 END,
           break_started_at = NULL
       WHERE id = $1 AND ended_at IS NULL
       RETURNING *`,
      [id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Session not found or already closed' });
    return res.json(sessionView(r.rows[0]));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
