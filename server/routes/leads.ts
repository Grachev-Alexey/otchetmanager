import { Router } from 'express';
import { db } from '../db';

const router = Router();

function dbRequired(res: any) {
  return res.status(503).json({ error: 'База данных недоступна' });
}

// GET /api/leads
router.get('/', async (_req, res) => {
  if (!db.pool || !db.isConnected) return dbRequired(res);
  try {
    const result = await db.pool.query(`
      SELECT
        lr.*,
        (SELECT y.status FROM yookassa y
           WHERE lr.amocrm_lead_id <> ''
             AND y.deal_id::text = lr.amocrm_lead_id
             AND y.status = 'succeeded'
           LIMIT 1) AS yookassa_status,
        (SELECT y.summa FROM yookassa y
           WHERE lr.amocrm_lead_id <> ''
             AND y.deal_id::text = lr.amocrm_lead_id
             AND y.status = 'succeeded'
           LIMIT 1) AS yookassa_amount
      FROM leads_reporting lr
      ORDER BY lr.booking_date DESC, lr.created_at DESC
    `);
    return res.json(result.rows.map(r => ({
      id: r.id,
      managerName: r.manager_name,
      clientName: r.client_name,
      clientPhone: r.client_phone,
      amocrmLeadId: r.amocrm_lead_id,
      bookingDate: r.booking_date,
      status: r.status,
      city: r.city || '',
      depositRequired: r.deposit_required,
      depositAmount: parseFloat(r.deposit_amount),
      depositPaid: r.deposit_paid,
      visitCost: r.visit_cost != null ? parseFloat(r.visit_cost) : 2090,
      comments: r.comments,
      yookassaPaid: r.yookassa_status === 'succeeded',
      yookassaAmount: r.yookassa_amount ? parseFloat(r.yookassa_amount) : null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })));
  } catch (err: any) {
    return res.status(500).json({ error: 'Database query error: ' + err.message });
  }
});

// GET /api/leads/lookup?amocrmId=XXXXX
router.get('/lookup', async (req, res) => {
  const { amocrmId } = req.query;
  if (!amocrmId || typeof amocrmId !== 'string') {
    return res.status(400).json({ error: 'amocrmId required' });
  }
  if (!db.pool || !db.isConnected) return dbRequired(res);
  try {
    const amoResult = await db.pool.query(
      `SELECT name, phone FROM leads WHERE deal_id = $1::BIGINT LIMIT 1`,
      [amocrmId]
    );
    if (amoResult.rows.length > 0) {
      const r = amoResult.rows[0];
      return res.json({ found: true, clientName: r.name || '', clientPhone: r.phone || '', source: 'amocrm' });
    }
    const reportResult = await db.pool.query(
      `SELECT client_name, client_phone FROM leads_reporting
       WHERE amocrm_lead_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [amocrmId]
    );
    if (reportResult.rows.length > 0) {
      const r = reportResult.rows[0];
      return res.json({ found: true, clientName: r.client_name || '', clientPhone: r.client_phone || '', source: 'history' });
    }
    return res.json({ found: false });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/checkin
router.get('/checkin', async (req, res) => {
  const { managerName, role } = req.query as { managerName: string; role: string };
  if (!db.pool || !db.isConnected) return dbRequired(res);
  try {
    const isAdmin = role === 'admin';
    const params: any[] = isAdmin ? [] : [managerName];
    const managerFilter = isAdmin ? '' : `AND lr.manager_name = $1`;

    const result = await db.pool.query(`
      SELECT
        lr.id, lr.manager_name, lr.client_name, lr.client_phone,
        lr.amocrm_lead_id, lr.booking_date, lr.status, lr.city,
        lr.deposit_required, lr.deposit_amount, lr.deposit_paid,
        lr.visit_cost, lr.comments, lr.created_at,
        yr.attendance        AS yclients_attendance,
        yr.staff_name        AS yclients_staff,
        (SELECT y.status FROM yookassa y
           WHERE y.deal_id::text = lr.amocrm_lead_id
             AND y.status = 'succeeded'
           LIMIT 1)          AS yookassa_status,
        (SELECT y.summa FROM yookassa y
           WHERE y.deal_id::text = lr.amocrm_lead_id
             AND y.status = 'succeeded'
           LIMIT 1)          AS yookassa_amount
      FROM leads_reporting lr
      LEFT JOIN yclients_record yr ON (
        LENGTH(REGEXP_REPLACE(COALESCE(lr.client_phone,''), '[^0-9]', '', 'g')) >= 10
        AND RIGHT(REGEXP_REPLACE(COALESCE(lr.client_phone,''), '[^0-9]', '', 'g'), 10)
            = RIGHT(yr.client_phone, 10)
        AND yr.date_visit::date = lr.booking_date
      )
      WHERE lr.booking_date < (NOW() AT TIME ZONE 'Europe/Moscow')::date
        AND lr.status IN ('booked','rescheduled')
        ${managerFilter}
      ORDER BY lr.booking_date DESC
    `, params);

    return res.json(result.rows.map(r => ({
      id: r.id,
      managerName: r.manager_name,
      clientName: r.client_name,
      clientPhone: r.client_phone,
      amocrmLeadId: r.amocrm_lead_id,
      bookingDate: r.booking_date,
      status: r.status,
      city: r.city || '',
      depositRequired: r.deposit_required,
      depositAmount: parseFloat(r.deposit_amount || 0),
      depositPaid: r.deposit_paid,
      visitCost: r.visit_cost != null ? parseFloat(r.visit_cost) : 2090,
      comments: r.comments,
      yclientsAttendance: r.yclients_attendance ?? null,
      yclientsStaff: r.yclients_staff ?? null,
      yookassaPaid: r.yookassa_status === 'succeeded',
      yookassaAmount: r.yookassa_amount ? parseFloat(r.yookassa_amount) : null,
    })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/leads/:id/quick
router.patch('/:id/quick', async (req, res) => {
  const { id } = req.params;
  const { status, depositPaid } = req.body;
  if (!db.pool || !db.isConnected) return dbRequired(res);
  try {
    const sets: string[] = ['updated_at = NOW()'];
    const vals: any[] = [];
    if (status !== undefined) { vals.push(status); sets.push(`status = $${vals.length}`); }
    if (depositPaid !== undefined) { vals.push(depositPaid); sets.push(`deposit_paid = $${vals.length}`); }
    vals.push(id);
    await db.pool.query(
      `UPDATE leads_reporting SET ${sets.join(', ')} WHERE id = $${vals.length}`,
      vals
    );
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/leads
router.post('/', async (req, res) => {
  const { id, managerName, clientName, clientPhone, amocrmLeadId,
          bookingDate, status, city, depositRequired, depositAmount, depositPaid, visitCost, comments } = req.body;

  if (!managerName || !clientName || !bookingDate) {
    return res.status(400).json({ error: 'Отсутствуют обязательные поля' });
  }
  if (!db.pool || !db.isConnected) return dbRequired(res);

  const leadId = id || `lead-${Date.now()}`;
  const finalStatus = status || 'booked';
  const now = new Date().toISOString();

  try {
    await db.pool.query(`
      INSERT INTO leads_reporting (
        id, manager_name, client_name, client_phone, amocrm_lead_id,
        booking_date, status, city, deposit_required, deposit_amount, deposit_paid,
        visit_cost, comments, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (id) DO UPDATE SET
        manager_name = EXCLUDED.manager_name,
        client_name = EXCLUDED.client_name,
        client_phone = EXCLUDED.client_phone,
        amocrm_lead_id = EXCLUDED.amocrm_lead_id,
        booking_date = EXCLUDED.booking_date,
        status = EXCLUDED.status,
        city = EXCLUDED.city,
        deposit_required = EXCLUDED.deposit_required,
        deposit_amount = EXCLUDED.deposit_amount,
        deposit_paid = EXCLUDED.deposit_paid,
        visit_cost = EXCLUDED.visit_cost,
        comments = EXCLUDED.comments,
        updated_at = EXCLUDED.updated_at
    `, [leadId, managerName, clientName, clientPhone || '', amocrmLeadId || '',
        bookingDate, finalStatus, city || '', !!depositRequired, depositAmount || 0,
        !!depositPaid, visitCost != null ? visitCost : 2090, comments || '', now, now]);
    return res.json({ id: leadId, success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Database write error: ' + err.message });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!db.pool || !db.isConnected) return dbRequired(res);
  try {
    await db.pool.query('DELETE FROM leads_reporting WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
