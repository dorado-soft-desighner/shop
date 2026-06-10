const express = require('express');
const router = express.Router();
const { pool } = require('../database/dbConfig');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// POST /api/sales/checkout - Submit a new sale
router.post('/checkout', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { items, discount, payment_method, amount_received, payment_details } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty or invalid.' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const saleItems = [];
    let subtotal = 0;
    let totalCost = 0;

    // Process items & validate stock
    for (const item of items) {
      const [productRows] = await connection.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [item.id]);
      const product = productRows[0];
      
      if (!product) {
        await connection.rollback();
        return res.status(404).json({ error: `Product '${item.name}' not found in inventory.` });
      }

      if (product.stock_quantity < item.quantity) {
        await connection.rollback();
        return res.status(400).json({ 
          error: `Insufficient stock for product '${product.name}'. Remaining stock: ${product.stock_quantity}.` 
        });
      }

      const itemTotal = Number(product.price) * Number(item.quantity);
      const itemCost = Number(product.cost_price) * Number(item.quantity);
      subtotal += itemTotal;
      totalCost += itemCost;

      saleItems.push({
        product_id: product.id,
        product_name: product.name,
        barcode: product.barcode,
        quantity: Number(item.quantity),
        price: Number(product.price),
        cost_price: Number(product.cost_price),
        total: itemTotal
      });
    }

    // Calculate numbers
    const discountAmt = Number(discount || 0);
    const netTotal = Math.max(0, subtotal - discountAmt);
    const amtReceived = Number(amount_received || netTotal);
    const changeGiven = Math.max(0, amtReceived - netTotal);

    // Generate Invoice Number: INV-YYYYMMDD-HHMMSS
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const invoiceNo = `INV-${dateStr}-${timeStr}`;

    // Decrement Stock
    for (const item of saleItems) {
      await connection.query(
        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    let p_type = null;
    let p_ref = null;
    if (payment_details) {
      p_type = payment_details.type || null;
      p_ref = payment_details.refNo || null;
    }

    // Create Sale record
    const [saleResult] = await connection.query(
      `INSERT INTO sales (invoice_no, cashier_id, cashier_name, subtotal, discount, net_total, total_cost, payment_method, payment_details_type, payment_details_refno, amount_received, change_given, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoiceNo, req.user.id, req.user.full_name, subtotal, discountAmt, netTotal, totalCost, payment_method, p_type, p_ref, amtReceived, changeGiven, now]
    );

    // Insert Sale Items
    for (const item of saleItems) {
      await connection.query(
        `INSERT INTO sale_items (sale_id, product_id, product_name, barcode, quantity, price, cost_price, total) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [saleResult.insertId, item.product_id, item.product_name, item.barcode, item.quantity, item.price, item.cost_price, item.total]
      );
    }

    await connection.commit();

    const [newSaleRows] = await connection.query('SELECT * FROM sales WHERE id = ?', [saleResult.insertId]);
    const newSale = newSaleRows[0];
    newSale.items = saleItems;

    res.status(201).json(newSale);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  } finally {
    if (connection) connection.release();
  }
});

// GET /api/sales/invoice/:invoice_no - Retrieve a single invoice
router.get('/invoice/:invoice_no', authenticateToken, async (req, res) => {
  try {
    const [saleRows] = await pool.query('SELECT * FROM sales WHERE invoice_no = ?', [req.params.invoice_no]);
    if (saleRows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }
    const sale = saleRows[0];
    
    const [itemRows] = await pool.query('SELECT * FROM sale_items WHERE sale_id = ?', [sale.id]);
    sale.items = itemRows;
    
    res.json(sale);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/sales/returns - Retrieve return transactions (Admin Only)
router.get('/returns', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [returns] = await pool.query('SELECT * FROM returns_table ORDER BY created_at DESC');
    
    // Attach items
    const [items] = await pool.query('SELECT * FROM return_items');
    for (const r of returns) {
      r.items = items.filter(item => item.return_id === r.id);
    }
    
    res.json(returns);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/sales/return - Submit a sales return linked to an invoice
router.post('/return', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { original_invoice_no, items, reason, return_type, payment_method } = req.body;

    if (!original_invoice_no) {
      return res.status(400).json({ error: 'Original invoice number is required.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Return items list is empty or invalid.' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Find original sale
    const [saleRows] = await connection.query('SELECT * FROM sales WHERE invoice_no = ? FOR UPDATE', [original_invoice_no]);
    const sale = saleRows[0];
    if (!sale) {
      await connection.rollback();
      return res.status(404).json({ error: 'Original invoice not found.' });
    }
    
    const [saleItems] = await connection.query('SELECT * FROM sale_items WHERE sale_id = ? FOR UPDATE', [sale.id]);

    const returnItems = [];
    let totalRefund = 0;
    let totalCostAdjustment = 0;

    for (const item of items) {
      const [productRows] = await connection.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [item.id]);
      const product = productRows[0];
      if (!product) {
        await connection.rollback();
        return res.status(404).json({ error: `Product '${item.name}' not found.` });
      }

      // Find the item inside original sale
      const saleItem = saleItems.find(si => si.product_id === Number(item.id));
      if (!saleItem) {
        await connection.rollback();
        return res.status(400).json({ error: `Product '${item.name}' was not part of the original invoice ${original_invoice_no}.` });
      }

      const prevReturnedQty = Number(saleItem.returned_quantity) || 0;
      const availableToReturn = saleItem.quantity - prevReturnedQty;
      
      if (Number(item.quantity) > availableToReturn) {
        await connection.rollback();
        return res.status(400).json({
          error: `Cannot return ${item.quantity} units of '${item.name}'. Only ${availableToReturn} unit(s) available for return (Already returned: ${prevReturnedQty}/${saleItem.quantity}).`
        });
      }

      const refund = Number(saleItem.price) * Number(item.quantity);
      const costAdjust = Number(saleItem.cost_price) * Number(item.quantity);
      totalRefund += refund;
      totalCostAdjustment += costAdjust;

      returnItems.push({
        sale_item_id: saleItem.id,
        product_id: product.id,
        product_name: product.name,
        barcode: product.barcode,
        quantity: Number(item.quantity),
        price: Number(saleItem.price),
        cost_price: Number(saleItem.cost_price),
        refund_amount: refund
      });
    }

    // Generate Return Credit Note ID: RET-YYYYMMDD-HHMMSS
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const returnNo = `RET-${dateStr}-${timeStr}`;

    // Increment Stock (Inventory Restocking)
    for (const item of returnItems) {
      await connection.query(
        'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
      
      // Mark returned_quantity on sale_items
      await connection.query(
        'UPDATE sale_items SET returned_quantity = returned_quantity + ? WHERE id = ?',
        [item.quantity, item.sale_item_id]
      );
    }

    // Calculate new totals for the sale
    const newSubtotal = Math.max(0, Number(sale.subtotal) - totalRefund);
    const newNetTotal = Math.max(0, Number(sale.net_total) - totalRefund);
    const newTotalCost = Math.max(0, Number(sale.total_cost || 0) - totalCostAdjustment);
    const newReturnedAmount = Number(sale.returned_amount || 0) + totalRefund;

    await connection.query(
      'UPDATE sales SET subtotal = ?, net_total = ?, total_cost = ?, returned_amount = ? WHERE id = ?',
      [newSubtotal, newNetTotal, newTotalCost, newReturnedAmount, sale.id]
    );

    // Record Return / Credit Note
    const [returnResult] = await connection.query(
      `INSERT INTO returns_table (return_no, original_invoice_no, cashier_id, cashier_name, total_refund, return_type, payment_method, reason, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [returnNo, original_invoice_no, req.user.id, req.user.full_name, totalRefund, return_type || 'refund', payment_method || 'cash', reason || '', now]
    );

    for (const rItem of returnItems) {
      await connection.query(
        `INSERT INTO return_items (return_id, product_id, product_name, barcode, quantity, price, cost_price, refund_amount) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [returnResult.insertId, rItem.product_id, rItem.product_name, rItem.barcode, rItem.quantity, rItem.price, rItem.cost_price, rItem.refund_amount]
      );
    }

    await connection.commit();

    const [newReturnRows] = await connection.query('SELECT * FROM returns_table WHERE id = ?', [returnResult.insertId]);
    const newReturn = newReturnRows[0];
    newReturn.items = returnItems;

    res.status(201).json(newReturn);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  } finally {
    if (connection) connection.release();
  }
});

// GET /api/sales/history - Retrieve checkout transactions (Admin Only)
router.get('/history', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [sales] = await pool.query('SELECT * FROM sales ORDER BY created_at DESC');
    
    // Attach items
    const [items] = await pool.query('SELECT * FROM sale_items');
    for (const sale of sales) {
      sale.items = items.filter(item => item.sale_id === sale.id);
    }
    
    res.json(sales);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/sales/reports - Retrieve aggregated analytics (Admin Only)
router.get('/reports', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [sales] = await pool.query('SELECT * FROM sales');
    const [products] = await pool.query('SELECT * FROM products');
    const [saleItems] = await pool.query('SELECT sale_items.*, products.category FROM sale_items LEFT JOIN products ON sale_items.product_id = products.id');

    let totalRevenue = 0;
    let totalCost = 0;
    let totalDiscount = 0;
    let transactionsCount = sales.length;

    const categorySales = {};
    const cashierSales = {};
    const dailySalesTrend = {};

    sales.forEach(sale => {
      totalRevenue += Number(sale.net_total);
      totalCost += Number(sale.total_cost || 0);
      totalDiscount += Number(sale.discount || 0);

      // Group by Cashier
      cashierSales[sale.cashier_name] = (cashierSales[sale.cashier_name] || 0) + Number(sale.net_total);

      // Group by Date (YYYY-MM-DD)
      const dateStr = new Date(sale.created_at).toISOString();
      const dateKey = dateStr.slice(0, 10);
      dailySalesTrend[dateKey] = (dailySalesTrend[dateKey] || 0) + Number(sale.net_total);
    });

    saleItems.forEach(item => {
      const cat = item.category || 'Unknown';
      categorySales[cat] = (categorySales[cat] || 0) + Number(item.total);
    });

    const totalProfit = totalRevenue - totalCost;
    const avgOrderValue = transactionsCount > 0 ? (totalRevenue / transactionsCount) : 0;

    // Calculate Low Stock Products
    const lowStockProducts = products.filter(p => p.stock_quantity <= p.low_stock_threshold);

    // Format charts data
    const trendData = Object.entries(dailySalesTrend)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-10)
      .map(([date, amount]) => ({ date, amount }));

    const categoryData = Object.entries(categorySales).map(([name, value]) => ({ name, value }));
    const cashierData = Object.entries(cashierSales).map(([name, value]) => ({ name, value }));

    res.json({
      summary: {
        totalRevenue,
        totalProfit,
        totalDiscount,
        transactionsCount,
        avgOrderValue,
        lowStockCount: lowStockProducts.length
      },
      lowStockProducts,
      charts: {
        trendData,
        categoryData,
        cashierData
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/sales/generate-report - Generate financial report (daily/monthly/yearly)
router.get('/generate-report', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { type, date } = req.query;

    if (!type || !date) {
      return res.status(400).json({ error: 'Report type and date are required.' });
    }

    const [sales] = await pool.query('SELECT * FROM sales');
    const [returns] = await pool.query('SELECT * FROM returns_table');

    // Filter sales based on report type
    let filteredSales = [];
    let periodLabel = '';

    if (type === 'daily') {
      filteredSales = sales.filter(s => {
        const d = new Date(s.created_at).toISOString();
        return d.slice(0, 10) === date;
      });
      periodLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } else if (type === 'monthly') {
      filteredSales = sales.filter(s => {
        const d = new Date(s.created_at).toISOString();
        return d.slice(0, 7) === date;
      });
      const [y, m] = date.split('-');
      periodLabel = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
    } else if (type === 'yearly') {
      filteredSales = sales.filter(s => {
        const d = new Date(s.created_at).toISOString();
        return d.slice(0, 4) === date;
      });
      periodLabel = `Year ${date}`;
    } else {
      return res.status(400).json({ error: 'Invalid report type. Use daily, monthly, or yearly.' });
    }

    // Filter returns for the same period
    let filteredReturns = [];
    if (type === 'daily') {
      filteredReturns = returns.filter(r => {
        const d = new Date(r.created_at).toISOString();
        return d.slice(0, 10) === date;
      });
    } else if (type === 'monthly') {
      filteredReturns = returns.filter(r => {
        const d = new Date(r.created_at).toISOString();
        return d.slice(0, 7) === date;
      });
    } else if (type === 'yearly') {
      filteredReturns = returns.filter(r => {
        const d = new Date(r.created_at).toISOString();
        return d.slice(0, 4) === date;
      });
    }

    // Financial calculations
    let totalRevenue = 0;
    let totalCost = 0;
    let totalDiscount = 0;
    let transactionCount = filteredSales.length;

    const paymentBreakdown = {
      cash: { count: 0, amount: 0 },
      card: { count: 0, amount: 0 },
      qr: { count: 0, amount: 0 },
      other: { count: 0, amount: 0 }
    };

    const dailyBreakdown = {};

    filteredSales.forEach(sale => {
      totalRevenue += Number(sale.net_total || 0);
      totalCost += Number(sale.total_cost || 0);
      totalDiscount += Number(sale.discount || 0);

      const method = (sale.payment_method || 'cash').toLowerCase();
      if (method === 'cash') {
        paymentBreakdown.cash.count++;
        paymentBreakdown.cash.amount += Number(sale.net_total || 0);
      } else if (method === 'card') {
        paymentBreakdown.card.count++;
        paymentBreakdown.card.amount += Number(sale.net_total || 0);
      } else if (method === 'mobile qr' || method === 'qr') {
        paymentBreakdown.qr.count++;
        paymentBreakdown.qr.amount += Number(sale.net_total || 0);
      } else {
        paymentBreakdown.other.count++;
        paymentBreakdown.other.amount += Number(sale.net_total || 0);
      }

      const dayKey = new Date(sale.created_at).toISOString().slice(0, 10);
      if (!dailyBreakdown[dayKey]) {
        dailyBreakdown[dayKey] = { revenue: 0, cost: 0, transactions: 0 };
      }
      dailyBreakdown[dayKey].revenue += Number(sale.net_total || 0);
      dailyBreakdown[dayKey].cost += Number(sale.total_cost || 0);
      dailyBreakdown[dayKey].transactions++;
    });

    let totalRefunds = 0;
    let returnCount = filteredReturns.length;
    filteredReturns.forEach(ret => {
      totalRefunds += Number(ret.total_refund || 0);
    });

    const totalProfit = totalRevenue - totalCost;
    const netRevenue = totalRevenue - totalRefunds;

    const dailyData = Object.entries(dailyBreakdown)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.revenue - data.cost,
        transactions: data.transactions
      }));

    res.json({
      reportType: type,
      period: date,
      periodLabel,
      generatedAt: new Date().toISOString(),
      summary: {
        totalRevenue,
        totalCost,
        totalProfit,
        totalDiscount,
        totalRefunds,
        netRevenue,
        transactionCount,
        returnCount
      },
      paymentBreakdown,
      dailyData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
