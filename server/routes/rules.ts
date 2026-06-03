import { Router } from 'express';
import { db } from '../db';
import { readLocalRules, writeLocalRules } from '../localFallback';

const router = Router();

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

const RULE_DEFAULTS = {
  perShowUpHigh: 350,
  perShowUpLow:  200,
  perPoHigh:     150,
  perPoLow:      100,
  hourlyRate:    85,
  poThreshold:   140,
};

// GET /api/rules
router.get('/', async (_req, res) => {
  if (db.pool && db.isConnected) {
    try {
      const result = await db.pool.query(
        "SELECT * FROM commission_rules WHERE id = 'default'"
      );
      if (result.rows.length > 0) {
        return res.json(mapRulesRow(result.rows[0]));
      }
    } catch (err) {
      console.error('[Rules] DB read error:', err);
    }
  }
  // Merge stored local rules with defaults to handle stale/old-format files
  return res.json({ ...RULE_DEFAULTS, ...readLocalRules() });
});

// POST /api/rules
router.post('/', async (req, res) => {
  const { perShowUpHigh, perShowUpLow, perPoHigh, perPoLow, hourlyRate, poThreshold } = req.body;

  if (db.pool && db.isConnected) {
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
  }
  writeLocalRules({ perShowUpHigh, perShowUpLow, perPoHigh, perPoLow, hourlyRate, poThreshold });
  res.json({ success: true });
});

export default router;
