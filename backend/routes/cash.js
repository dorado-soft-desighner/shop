const express = require('express');
const router = express.Router();
const { pool } = require('../database/dbConfig');
const { authenticateToken } = require('../middleware/auth');

// POST /api/cash - Record a Paid In or Paid Out transaction
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { type, amount, reason, issued_to } = req.body;

    if (!type || !amount || !reason) {
      return res.status(400).json({ error: 'Type, amount, and reason are required.' });
    }

    if (!['paid_in', 'paid_out'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "paid_in" or "paid_out".' });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero.' });
    }

    // Find the active shift for the cashier
    const [shiftRows] = await pool.query(
      "SELECT * FROM shifts WHERE cashier_id = ? AND status = 'open' LIMIT 1",
      [req.user.id]
    );

    if (shiftRows.length === 0) {
      return res.status(400).json({ error: 'No active shift found. Please open a shift before recording cash transactions.' });
    }

    const activeShift = shiftRows[0];

    // Insert the cash transaction
    const now = new Date();
    const [result] = await pool.query(
      `INSERT INTO cash_transactions (shift_id, cashier_id, cashier_name, type, amount, reason, issued_to, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [activeShift.id, req.user.id, req.user.full_name, type, Number(amount), reason, issued_to || null, now]
    );

    // Update shift totals
    if (type === 'paid_in') {
      await pool.query(
        'UPDATE shifts SET total_paid_in = total_paid_in + ? WHERE id = ?',
        [Number(amount), activeShift.id]
      );
    } else {
      await pool.query(
        'UPDATE shifts SET total_paid_out = total_paid_out + ? WHERE id = ?',
        [Number(amount), activeShift.id]
      );
    }

    // Fetch the newly created transaction
    const [newRows] = await pool.query('SELECT * FROM cash_transactions WHERE id = ?', [result.insertId]);

    res.status(201).json(newRows[0]);
  } catch (error) {
    console.error('Cash transaction error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/cash/shift/:shift_id - Get all cash transactions for a specific shift
router.get('/shift/:shift_id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM cash_transactions WHERE shift_id = ? ORDER BY created_at DESC',
      [req.params.shift_id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get cash transactions error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/cash/active - Get transactions for the currently active shift
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const [shiftRows] = await pool.query(
      "SELECT id FROM shifts WHERE cashier_id = ? AND status = 'open' LIMIT 1",
      [req.user.id]
    );

    if (shiftRows.length === 0) {
      return res.json([]);
    }

    const [rows] = await pool.query(
      'SELECT * FROM cash_transactions WHERE shift_id = ? ORDER BY created_at DESC',
      [shiftRows[0].id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get active cash transactions error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
