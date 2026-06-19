const { pool } = require('./dbConfig');

async function runAutoMigrations() {
  try {
    console.log('Running database schema auto-migrations / checks...');

    // 1. Check and add columns in 'shifts' table
    const [columns] = await pool.query('SHOW COLUMNS FROM shifts');
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('total_paid_in')) {
      console.log('Auto-migration: Adding total_paid_in column to shifts...');
      await pool.query('ALTER TABLE shifts ADD COLUMN total_paid_in DECIMAL(10,2) DEFAULT 0');
    }

    if (!columnNames.includes('total_paid_out')) {
      console.log('Auto-migration: Adding total_paid_out column to shifts...');
      await pool.query('ALTER TABLE shifts ADD COLUMN total_paid_out DECIMAL(10,2) DEFAULT 0');
    }

    // 2. Check and create 'cash_transactions' table
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);

    if (!tableNames.includes('cash_transactions')) {
      console.log('Auto-migration: Creating cash_transactions table...');
      await pool.query(`
        CREATE TABLE cash_transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          shift_id INT,
          cashier_id INT,
          cashier_name VARCHAR(100),
          type ENUM('paid_in', 'paid_out') NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          reason VARCHAR(255),
          issued_to VARCHAR(100),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
          FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
    }

    console.log('Database auto-migrations / checks completed successfully!');
  } catch (error) {
    console.error('Error executing database auto-migrations:', error);
  }
}

module.exports = { runAutoMigrations };
