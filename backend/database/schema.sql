-- Database is selected automatically by the connection pool
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role ENUM('admin', 'cashier') DEFAULT 'cashier',
  status ENUM('active', 'inactive') DEFAULT 'active'
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  barcode VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) NOT NULL,
  stock_quantity INT DEFAULT 0,
  low_stock_threshold INT DEFAULT 5,
  image_url TEXT
);

-- Sales table (header)
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_no VARCHAR(50) UNIQUE NOT NULL,
  cashier_id INT,
  cashier_name VARCHAR(100),
  subtotal DECIMAL(10,2),
  discount DECIMAL(10,2) DEFAULT 0,
  net_total DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  payment_method VARCHAR(30),
  payment_details_type VARCHAR(50),
  payment_details_refno VARCHAR(50),
  amount_received DECIMAL(10,2),
  change_given DECIMAL(10,2),
  returned_amount DECIMAL(10,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Sale items table
CREATE TABLE IF NOT EXISTS sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  product_id INT,
  product_name VARCHAR(200),
  barcode VARCHAR(50),
  quantity INT NOT NULL,
  price DECIMAL(10,2),
  cost_price DECIMAL(10,2),
  total DECIMAL(10,2),
  returned_quantity INT DEFAULT 0,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cashier_id INT,
  cashier_name VARCHAR(100),
  start_time DATETIME,
  end_time DATETIME,
  opening_balance DECIMAL(10,2),
  opening_denominations JSON,
  closing_balance DECIMAL(10,2),
  closing_denominations JSON,
  status ENUM('open', 'closed') DEFAULT 'open',
  cash_sales DECIMAL(10,2) DEFAULT 0,
  card_sales DECIMAL(10,2) DEFAULT 0,
  qr_sales DECIMAL(10,2) DEFAULT 0,
  total_discounts DECIMAL(10,2) DEFAULT 0,
  net_sales DECIMAL(10,2) DEFAULT 0,
  expected_cash DECIMAL(10,2) DEFAULT 0,
  discrepancy DECIMAL(10,2) DEFAULT 0,
  total_paid_in DECIMAL(10,2) DEFAULT 0,
  total_paid_out DECIMAL(10,2) DEFAULT 0,
  FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE SET NULL
);

-- GRNs table (header)
CREATE TABLE IF NOT EXISTS grns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grn_no VARCHAR(50) UNIQUE NOT NULL,
  supplier_name VARCHAR(200),
  reference_no VARCHAR(100),
  total_value DECIMAL(10,2),
  created_by VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- GRN items table
CREATE TABLE IF NOT EXISTS grn_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grn_id INT NOT NULL,
  product_id INT,
  product_name VARCHAR(200),
  barcode VARCHAR(50),
  quantity INT NOT NULL,
  cost_price DECIMAL(10,2),
  total DECIMAL(10,2),
  FOREIGN KEY (grn_id) REFERENCES grns(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Returns table (header)
CREATE TABLE IF NOT EXISTS returns_table (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_no VARCHAR(50) UNIQUE NOT NULL,
  original_invoice_no VARCHAR(50),
  cashier_id INT,
  cashier_name VARCHAR(100),
  total_refund DECIMAL(10,2),
  return_type VARCHAR(30),
  payment_method VARCHAR(30),
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Return items table
CREATE TABLE IF NOT EXISTS return_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_id INT NOT NULL,
  product_id INT,
  product_name VARCHAR(200),
  barcode VARCHAR(50),
  quantity INT NOT NULL,
  price DECIMAL(10,2),
  cost_price DECIMAL(10,2),
  refund_amount DECIMAL(10,2),
  FOREIGN KEY (return_id) REFERENCES returns_table(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Cash Transactions table
CREATE TABLE IF NOT EXISTS cash_transactions (
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
);
