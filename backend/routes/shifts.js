const express = require('express');
const router = express.Router();
const { pool } = require('../database/dbConfig');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// GET /api/shifts/active - Get the cashier's current active open shift
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM shifts WHERE cashier_id = ? AND status = "open" LIMIT 1', [req.user.id]);
    if (rows.length === 0) {
      return res.json({ active: false });
    }
    const shift = rows[0];
    if (typeof shift.opening_denominations === 'string') {
      shift.opening_denominations = JSON.parse(shift.opening_denominations);
    }
    if (typeof shift.closing_denominations === 'string') {
      shift.closing_denominations = JSON.parse(shift.closing_denominations);
    }
    res.json({ active: true, shift });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/shifts/start - Start a new shift (Opening Cash Box)
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { opening_balance, opening_denominations } = req.body;

    if (opening_balance === undefined || !opening_denominations) {
      return res.status(400).json({ error: 'Opening balance and cash box counts are required.' });
    }

    const [existing] = await pool.query('SELECT id FROM shifts WHERE cashier_id = ? AND status = "open"', [req.user.id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'You already have an active open session. Please end it first.' });
    }

    const start_time = new Date();
    
    const [result] = await pool.query(
      `INSERT INTO shifts (cashier_id, cashier_name, start_time, opening_balance, opening_denominations, status) 
       VALUES (?, ?, ?, ?, ?, 'open')`,
      [req.user.id, req.user.full_name, start_time, Number(opening_balance), JSON.stringify(opening_denominations)]
    );

    const [newRows] = await pool.query('SELECT * FROM shifts WHERE id = ?', [result.insertId]);
    res.status(201).json(newRows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/shifts/end - Close cashier shift (Z-Report Generation)
router.post('/end', authenticateToken, async (req, res) => {
  try {
    const { closing_balance, closing_denominations } = req.body;

    if (closing_balance === undefined || !closing_denominations) {
      return res.status(400).json({ error: 'Closing balance and cash box counts are required.' });
    }

    const [shiftRows] = await pool.query('SELECT * FROM shifts WHERE cashier_id = ? AND status = "open" LIMIT 1', [req.user.id]);
    if (shiftRows.length === 0) {
      return res.status(404).json({ error: 'No active session found for this cashier.' });
    }
    const activeShift = shiftRows[0];

    // Retrieve sales made during this shift session
    const [sales] = await pool.query(
      'SELECT net_total, discount, payment_method FROM sales WHERE cashier_id = ? AND created_at >= ?',
      [req.user.id, activeShift.start_time]
    );

    // Calculate cashier session stats
    let cashSales = 0;
    let cardSales = 0;
    let qrSales = 0;
    let totalDiscounts = 0;
    let netSales = 0;

    sales.forEach(sale => {
      netSales += Number(sale.net_total);
      totalDiscounts += Number(sale.discount || 0);

      const method = (sale.payment_method || '').toLowerCase();
      if (method === 'cash') {
        cashSales += Number(sale.net_total);
      } else if (method === 'card') {
        cardSales += Number(sale.net_total);
      } else if (method === 'mobile qr' || method === 'qr') {
        qrSales += Number(sale.net_total);
      }
    });

    // Retrieve cash transaction totals for this shift (Paid In / Paid Out)
    const [cashTxRows] = await pool.query(
      'SELECT type, SUM(amount) as total FROM cash_transactions WHERE shift_id = ? GROUP BY type',
      [activeShift.id]
    );
    let totalPaidIn = 0;
    let totalPaidOut = 0;
    cashTxRows.forEach(row => {
      if (row.type === 'paid_in') totalPaidIn = Number(row.total);
      if (row.type === 'paid_out') totalPaidOut = Number(row.total);
    });

    // Expected Cash = Opening Balance + Cash Sales + Paid In - Paid Out
    const expectedCash = Number(activeShift.opening_balance) + cashSales + totalPaidIn - totalPaidOut;
    const discrepancy = Number(closing_balance) - expectedCash;
    const end_time = new Date();

    await pool.query(
      `UPDATE shifts SET 
        end_time = ?, 
        closing_balance = ?, 
        closing_denominations = ?, 
        cash_sales = ?, 
        card_sales = ?, 
        qr_sales = ?, 
        total_discounts = ?, 
        net_sales = ?, 
        expected_cash = ?, 
        discrepancy = ?, 
        total_paid_in = ?,
        total_paid_out = ?,
        status = 'closed' 
       WHERE id = ?`,
      [end_time, Number(closing_balance), JSON.stringify(closing_denominations), cashSales, cardSales, qrSales, totalDiscounts, netSales, expectedCash, discrepancy, totalPaidIn, totalPaidOut, activeShift.id]
    );

    const [updatedRows] = await pool.query('SELECT * FROM shifts WHERE id = ?', [activeShift.id]);
    res.json(updatedRows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal server error.' });
  }
});

module.exports = router;
