import { Router } from 'express';
import { db } from '../db';
import { readLocalLeads, writeLocalLeads } from '../localFallback';

const router = Router();

// GET /api/leads
router.get('/', async (_req, res) => {
  if (db.pool && db.isConnected) {
    try {
      const result = await db.pool.query(
        'SELECT * FROM leads_reporting ORDER BY booking_date DESC, created_at DESC'
      );
      return res.json(result.rows.map(r => ({
        id: r.id,
        managerName: r.manager_name,
        clientName: r.client_name,
        clientPhone: r.client_phone,
        amocrmLeadId: r.amocrm_lead_id,
        bookingDate: r.booking_date,
        status: r.status,
        depositRequired: r.deposit_required,
        depositAmount: parseFloat(r.deposit_amount),
        depositPaid: r.deposit_paid,
        comments: r.comments,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })));
    } catch (err: any) {
      return res.status(500).json({ error: 'Database query error: ' + err.message });
    }
  }
  res.json(readLocalLeads());
});

// POST /api/leads  (create or upsert)
router.post('/', async (req, res) => {
  const { id, managerName, clientName, clientPhone, amocrmLeadId,
          bookingDate, status, depositRequired, depositAmount, depositPaid, comments } = req.body;

  if (!managerName || !clientName || !bookingDate || !status) {
    return res.status(400).json({ error: 'Отсутствуют обязательные поля' });
  }

  const leadId = id || `lead-${Date.now()}`;
  const now = new Date().toISOString();

  if (db.pool && db.isConnected) {
    try {
      await db.pool.query(`
        INSERT INTO leads_reporting (
          id, manager_name, client_name, client_phone, amocrm_lead_id,
          booking_date, status, deposit_required, deposit_amount, deposit_paid,
          comments, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
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
      `, [leadId, managerName, clientName, clientPhone || '', amocrmLeadId || '',
          bookingDate, status, !!depositRequired, depositAmount || 0,
          !!depositPaid, comments || '', now, now]);
      return res.json({ id: leadId, success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Database write error: ' + err.message });
    }
  }

  const leads = readLocalLeads();
  const existingIdx = leads.findIndex((l: any) => l.id === leadId);
  const record = {
    id: leadId, managerName, clientName,
    clientPhone: clientPhone || '', amocrmLeadId: amocrmLeadId || '',
    bookingDate, status, depositRequired: !!depositRequired,
    depositAmount: depositAmount || 0, depositPaid: !!depositPaid,
    comments: comments || '',
    createdAt: existingIdx >= 0 ? leads[existingIdx].createdAt : now,
    updatedAt: now,
  };
  if (existingIdx >= 0) leads[existingIdx] = record;
  else leads.push(record);
  writeLocalLeads(leads);
  res.json({ id: leadId, success: true });
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (db.pool && db.isConnected) {
    try {
      await db.pool.query('DELETE FROM leads_reporting WHERE id = $1', [id]);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
  writeLocalLeads(readLocalLeads().filter((l: any) => l.id !== id));
  res.json({ success: true });
});

export default router;
