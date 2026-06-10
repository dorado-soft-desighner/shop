const express = require('express');
const router = express.Router();
const { pool } = require('../database/dbConfig');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// GET /api/grn - Get all GRNs
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [grns] = await pool.query('SELECT * FROM grns ORDER BY created_at DESC');
    
    // Attach items to each GRN
    const [grnItems] = await pool.query('SELECT * FROM grn_items');
    for (const grn of grns) {
      grn.items = grnItems.filter(item => item.grn_id === grn.id);
    }
    
    res.json(grns);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/grn - Create a new GRN
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  let connection;
  try {
    const { supplier_name, supplier_contact, reference_no, po_number, store_name, remarks, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided for GRN.' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    let totalValue = 0;
    const processedItems = [];

    for (const item of items) {
      const [productRows] = await connection.query('SELECT * FROM products WHERE id = ?', [item.product_id]);
      const product = productRows[0];
      
      if (!product) {
        await connection.rollback();
        return res.status(404).json({ error: `Product ID ${item.product_id} not found.` });
      }

      const qty = Number(item.quantity) || 0;
      const cost = Number(item.cost_price) || product.cost_price;
      const itemTotal = qty * cost;
      totalValue += itemTotal;

      // Update product stock and cost price
      await connection.query(
        'UPDATE products SET stock_quantity = stock_quantity + ?, cost_price = ? WHERE id = ?',
        [qty, cost, product.id]
      );

      processedItems.push({
        product_id: product.id,
        product_name: product.name,
        barcode: product.barcode,
        quantity: qty,
        cost_price: cost,
        total: itemTotal
      });
    }

    // Generate GRN No
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const grnNo = `GRN-${dateStr}-${timeStr}`;

    const [grnResult] = await connection.query(
      `INSERT INTO grns (grn_no, supplier_name, reference_no, total_value, created_by, created_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [grnNo, supplier_name || 'Unknown', reference_no || '', totalValue, req.user.full_name, now]
    );

    for (const pItem of processedItems) {
      await connection.query(
        `INSERT INTO grn_items (grn_id, product_id, product_name, barcode, quantity, cost_price, total) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [grnResult.insertId, pItem.product_id, pItem.product_name, pItem.barcode, pItem.quantity, pItem.cost_price, pItem.total]
      );
    }

    await connection.commit();

    // Fetch the newly created GRN to return
    const [newGrnRows] = await pool.query('SELECT * FROM grns WHERE id = ?', [grnResult.insertId]);
    const newGrn = newGrnRows[0];
    newGrn.items = processedItems;

    res.status(201).json(newGrn);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
