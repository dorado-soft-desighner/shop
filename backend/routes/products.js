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
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { barcode, name, category, price, cost_price, stock_quantity, low_stock_threshold, image_url } = req.body;

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
      stock_quantity: stock_quantity !== undefined ? Number(stock_quantity) : product.stock_quantity,
      low_stock_threshold: low_stock_threshold !== undefined ? Number(low_stock_threshold) : product.low_stock_threshold,
      image_url: image_url !== undefined ? image_url : product.image_url
    });

    res.json(updatedProduct);
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
