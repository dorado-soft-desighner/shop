const express = require('express');
const router = express.Router();
const db = require('../database/mysqlDb');
const { pool } = require('../database/dbConfig');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// GET /api/products - Get all products
router.get('/', authenticateToken, async (req, res) => {
  try {
    const products = await db.findAll('products');
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/products/:id - Get a single product
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const product = await db.findById('products', req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/products - Create a new product (Admin Only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { barcode, name, category, price, cost_price, stock_quantity, low_stock_threshold, image_url } = req.body;

    if (!barcode || !name || !category || price === undefined || cost_price === undefined || stock_quantity === undefined) {
      return res.status(400).json({ error: 'Barcode, Name, Category, Price, Cost Price, and Stock Quantity are required.' });
    }

    // Check if barcode already exists
    const [existing] = await pool.query('SELECT id FROM products WHERE barcode = ?', [barcode]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Product with barcode '${barcode}' already exists.` });
    }

    const newProduct = await db.insert('products', {
      barcode,
      name,
      category,
      price: Number(price),
      cost_price: Number(cost_price),
      stock_quantity: Number(stock_quantity),
      low_stock_threshold: Number(low_stock_threshold || 5),
      image_url: image_url || ''
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/products/:id - Update product details (Admin Only)
// NOTE: stock_quantity is intentionally excluded - use /stock-adjust endpoint
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { barcode, name, category, price, cost_price, low_stock_threshold, image_url } = req.body;

    const product = await db.findById('products', req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Verify barcode uniqueness if changed
    if (barcode && barcode !== product.barcode) {
      const [existing] = await pool.query('SELECT id FROM products WHERE barcode = ?', [barcode]);
      if (existing.length > 0) {
        return res.status(400).json({ error: `Product with barcode '${barcode}' already exists.` });
      }
    }

    const updatedProduct = await db.update('products', req.params.id, {
      barcode: barcode || product.barcode,
      name: name || product.name,
      category: category || product.category,
      price: price !== undefined ? Number(price) : product.price,
      cost_price: cost_price !== undefined ? Number(cost_price) : product.cost_price,
      // stock_quantity is NOT updated here - use /stock-adjust route
      low_stock_threshold: low_stock_threshold !== undefined ? Number(low_stock_threshold) : product.low_stock_threshold,
      image_url: image_url !== undefined ? image_url : product.image_url
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/products/:id/stock-adjust - Adjust stock quantity (Admin Only + PIN)
router.post('/:id/stock-adjust', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { adjustment, reason, pin } = req.body;

    // Verify admin PIN (stored in env as STOCK_ADJUST_PIN, default 4321)
    const STOCK_PIN = process.env.STOCK_ADJUST_PIN || '4321';
    if (!pin || pin.toString() !== STOCK_PIN) {
      return res.status(403).json({ error: 'Invalid authorisation PIN. Stock adjustment denied.' });
    }

    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ error: 'A reason for the stock adjustment is required.' });
    }

    const adjustmentNum = parseInt(adjustment);
    if (isNaN(adjustmentNum)) {
      return res.status(400).json({ error: 'Adjustment must be a valid integer.' });
    }

    const product = await db.findById('products', req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const newQty = product.stock_quantity + adjustmentNum;
    if (newQty < 0) {
      return res.status(400).json({ error: `Cannot reduce stock below zero. Current stock: ${product.stock_quantity}` });
    }

    await pool.query(
      'UPDATE products SET stock_quantity = ? WHERE id = ?',
      [newQty, req.params.id]
    );

    console.log(`[STOCK ADJUST] Product: ${product.name} | By: ${req.user.full_name} | Change: ${adjustmentNum > 0 ? '+' : ''}${adjustmentNum} | Reason: ${reason} | Old: ${product.stock_quantity} | New: ${newQty}`);

    res.json({
      success: true,
      product_id: product.id,
      product_name: product.name,
      old_quantity: product.stock_quantity,
      adjustment: adjustmentNum,
      new_quantity: newQty,
      reason,
      adjusted_by: req.user.full_name
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/products/:id - Delete a product (Admin Only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const success = await db.delete('products', req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
