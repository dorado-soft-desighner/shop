USE dorado_pos;

-- Add paid in/out tracking columns to shifts table
ALTER TABLE shifts 
  ADD COLUMN total_paid_in DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN total_paid_out DECIMAL(10,2) DEFAULT 0;

-- Create cash_transactions table
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

SELECT 'Migration complete!' as result;
