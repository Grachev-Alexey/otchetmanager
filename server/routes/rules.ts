import { Router } from 'express';
import { db } from '../db';

const router = Router();

function dbRequired(res: any) {
  return res.status(503).json({ error: 'База данных недоступна' });
}

function mapRulesRow(r: any) {
  return {
    perShowUpHigh: parseFloat(r.per_show_up_high ?? 350),
    perShowUpLow:  parseFloat(r.per_show_up_low  ?? 200),
    perPoHigh:     parseFloat(r.per_po_high      ?? 150),
    perPoLow:      parseFloat(r.per_po_low       ?? 100),
    hourlyRate:    parseFloat(r.hourly_rate       ?? 85),
    poThreshold:   parseInt(r.po_threshold        ?? 140),
  };
}

// GET /api/rules
router.get('/', async (_req, res) => {
  if (!db.pool || !db.isConnected) return dbRequired(res);
  try {
    const result = await db.pool.query(
      "SELECT * FROM commission_rules WHERE id = 'default'"
    );
    if (result.rows.length > 0) {
      return res.json(mapRulesRow(result.rows[0]));
    }
    return res.status(404).json({ error: 'Правила комиссии не найдены' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/rules
router.post('/', async (req, res) => {
  const { perShowUpHigh, perShowUpLow, perPoHigh, perPoLow, hourlyRate, poThreshold } = req.body;
  if (!db.pool || !db.isConnected) return dbRequired(res);
  try {
    await db.pool.query(`
      INSERT INTO commission_rules
        (id, base_salary, per_booking, per_deposit_collected, per_show_up,
         target_bookings, bonus_amount,
         per_show_up_high, per_show_up_low, per_po_high, per_po_low, hourly_rate, po_threshold)
      VALUES ('default', 0, 0, 0, 0, 0, 0, $1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        per_show_up_high = EXCLUDED.per_show_up_high,
        per_show_up_low  = EXCLUDED.per_show_up_low,
        per_po_high      = EXCLUDED.per_po_high,
        per_po_low       = EXCLUDED.per_po_low,
        hourly_rate      = EXCLUDED.hourly_rate,
        po_threshold     = EXCLUDED.po_threshold,
        updated_at       = CURRENT_TIMESTAMP
    `, [perShowUpHigh, perShowUpLow, perPoHigh, perPoLow, hourlyRate, poThreshold]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Database write error: ' + err.message });
  }
});

export default router;
