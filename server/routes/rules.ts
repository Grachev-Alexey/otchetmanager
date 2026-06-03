import { Router } from 'express';
import { db } from '../db';
import { readLocalRules, writeLocalRules } from '../localFallback';

const router = Router();

// GET /api/rules
router.get('/', async (_req, res) => {
  if (db.pool && db.isConnected) {
    try {
      const result = await db.pool.query(
        "SELECT * FROM commission_rules WHERE id = 'default'"
      );
      if (result.rows.length > 0) {
        const r = result.rows[0];
        return res.json({
          baseSalary: parseFloat(r.base_salary),
          perBooking: parseFloat(r.per_booking),
          perDepositCollected: parseFloat(r.per_deposit_collected),
          perShowUp: parseFloat(r.per_show_up),
          targetBookings: parseInt(r.target_bookings),
          bonusAmount: parseFloat(r.bonus_amount),
        });
      }
    } catch (err) {
      console.error('[Rules] DB read error:', err);
    }
  }
  res.json(readLocalRules());
});

// POST /api/rules
router.post('/', async (req, res) => {
  const { baseSalary, perBooking, perDepositCollected, perShowUp, targetBookings, bonusAmount } = req.body;

  if (db.pool && db.isConnected) {
    try {
      await db.pool.query(`
        INSERT INTO commission_rules (id, base_salary, per_booking, per_deposit_collected, per_show_up, target_bookings, bonus_amount)
        VALUES ('default', $1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          base_salary = EXCLUDED.base_salary,
          per_booking = EXCLUDED.per_booking,
          per_deposit_collected = EXCLUDED.per_deposit_collected,
          per_show_up = EXCLUDED.per_show_up,
          target_bookings = EXCLUDED.target_bookings,
          bonus_amount = EXCLUDED.bonus_amount,
          updated_at = CURRENT_TIMESTAMP
      `, [baseSalary, perBooking, perDepositCollected, perShowUp, targetBookings, bonusAmount]);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Database write error: ' + err.message });
    }
  }
  writeLocalRules({ baseSalary, perBooking, perDepositCollected, perShowUp, targetBookings, bonusAmount });
  res.json({ success: true });
});

export default router;
