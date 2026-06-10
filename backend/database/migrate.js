const fs = require('fs');
const path = require('path');
const { pool } = require('./dbConfig');

const DATA_DIR = path.join(__dirname, 'data');

function toMysqlDate(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

async function migrateData() {
  try {
    console.log('Starting data migration...');
    
    // Disable foreign key checks to allow historical sales data with deleted products
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Users
    if (fs.existsSync(path.join(DATA_DIR, 'users.json'))) {
      const users = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users.json'), 'utf8'));
      for (const u of users) {
        await pool.query(
          `INSERT INTO users (id, username, password_hash, full_name, role, status) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id`,
          [u.id, u.username, u.password_hash, u.full_name, u.role, u.status]
        );
      }
      console.log(`Migrated ${users.length} users.`);
    }

    // 2. Products
    if (fs.existsSync(path.join(DATA_DIR, 'products.json'))) {
      const products = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'products.json'), 'utf8'));
      for (const p of products) {
        await pool.query(
          `INSERT INTO products (id, barcode, name, category, price, cost_price, stock_quantity, low_stock_threshold, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id`,
          [p.id, p.barcode, p.name, p.category, p.price, p.cost_price, p.stock_quantity, p.low_stock_threshold, p.image_url]
        );
      }
      console.log(`Migrated ${products.length} products.`);
    }

    // 3. Sales & Sale Items
    if (fs.existsSync(path.join(DATA_DIR, 'sales.json'))) {
      const sales = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'sales.json'), 'utf8'));
      let itemsCount = 0;
      for (const s of sales) {
        let p_type = null;
        let p_ref = null;
        if (s.payment_details) {
           p_type = s.payment_details.type || null;
           p_ref = s.payment_details.refNo || null;
        }

        await pool.query(
          `INSERT INTO sales (id, invoice_no, cashier_id, cashier_name, subtotal, discount, net_total, total_cost, payment_method, payment_details_type, payment_details_refno, amount_received, change_given, returned_amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id`,
          [s.id, s.invoice_no, s.cashier_id, s.cashier_name, s.subtotal, s.discount, s.net_total, s.total_cost, s.payment_method, p_type, p_ref, s.amount_received, s.change_given, s.returned_amount || 0, toMysqlDate(s.created_at) || toMysqlDate(new Date().toISOString())]
        );
        
        if (s.items && Array.isArray(s.items)) {
          for (const item of s.items) {
            await pool.query(
              `INSERT INTO sale_items (sale_id, product_id, product_name, barcode, quantity, price, cost_price, total, returned_quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [s.id, item.product_id, item.product_name, item.barcode, item.quantity, item.price, item.cost_price, item.total, item.returned_quantity || 0]
            );
            itemsCount++;
          }
        }
      }
      console.log(`Migrated ${sales.length} sales with ${itemsCount} items.`);
    }

    // 4. Shifts
    if (fs.existsSync(path.join(DATA_DIR, 'shifts.json'))) {
      const shifts = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'shifts.json'), 'utf8'));
      for (const s of shifts) {
        await pool.query(
          `INSERT INTO shifts (id, cashier_id, cashier_name, start_time, end_time, opening_balance, opening_denominations, closing_balance, closing_denominations, status, cash_sales, card_sales, qr_sales, total_discounts, net_sales, expected_cash, discrepancy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id`,
          [s.id, s.cashier_id, s.cashier_name, toMysqlDate(s.start_time), toMysqlDate(s.end_time), s.opening_balance, JSON.stringify(s.opening_denominations), s.closing_balance || null, JSON.stringify(s.closing_denominations || {}), s.status, s.cash_sales, s.card_sales, s.qr_sales, s.total_discounts, s.net_sales, s.expected_cash, s.discrepancy]
        );
      }
      console.log(`Migrated ${shifts.length} shifts.`);
    }

    // 5. GRNs
    if (fs.existsSync(path.join(DATA_DIR, 'grns.json'))) {
      const grns = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'grns.json'), 'utf8'));
      let grnItemsCount = 0;
      for (const g of grns) {
        await pool.query(
          `INSERT INTO grns (id, grn_no, supplier_name, reference_no, total_value, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id`,
          [g.id, g.grn_no, g.supplier_name, g.reference_no, g.total_value, g.created_by, toMysqlDate(g.created_at) || toMysqlDate(new Date().toISOString())]
        );
        
        if (g.items && Array.isArray(g.items)) {
          for (const item of g.items) {
            await pool.query(
              `INSERT INTO grn_items (grn_id, product_id, product_name, barcode, quantity, cost_price, total) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [g.id, item.product_id, item.product_name, item.barcode, item.quantity || item.quantity_ordered, item.cost_price, item.total]
            );
            grnItemsCount++;
          }
        }
      }
      console.log(`Migrated ${grns.length} GRNs with ${grnItemsCount} items.`);
    }

    // 6. Returns
    if (fs.existsSync(path.join(DATA_DIR, 'returns.json'))) {
      const returns = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'returns.json'), 'utf8'));
      let retItemsCount = 0;
      for (const r of returns) {
        await pool.query(
          `INSERT INTO returns_table (id, return_no, original_invoice_no, cashier_id, cashier_name, total_refund, return_type, payment_method, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id`,
          [r.id, r.return_no, r.original_invoice_no, r.cashier_id, r.cashier_name, r.total_refund, r.return_type, r.payment_method, r.reason, toMysqlDate(r.created_at) || toMysqlDate(new Date().toISOString())]
        );
        
        if (r.items && Array.isArray(r.items)) {
          for (const item of r.items) {
            await pool.query(
              `INSERT INTO return_items (return_id, product_id, product_name, barcode, quantity, price, cost_price, refund_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [r.id, item.product_id, item.product_name, item.barcode, item.quantity, item.price, item.cost_price, item.refund_amount]
            );
            retItemsCount++;
          }
        }
      }
      console.log(`Migrated ${returns.length} returns with ${retItemsCount} items.`);
    }

    // Re-enable foreign key checks
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Data migration complete!');
    process.exit(0);

  } catch (error) {
    console.error('Error migrating data:', error);
    process.exit(1);
  }
}

migrateData();
