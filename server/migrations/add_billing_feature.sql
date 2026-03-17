-- Billing feature migration
-- Run: mysql -u root -p image_approval < server/migrations/add_billing_feature.sql

-- 1. Add biller to role enum
ALTER TABLE users 
MODIFY COLUMN role ENUM('admin','student','biller') NOT NULL;

-- 2. Add billing columns to tasks
ALTER TABLE tasks 
ADD COLUMN is_billed TINYINT(1) DEFAULT 0,
ADD COLUMN billed_at TIMESTAMP NULL,
ADD COLUMN billed_by INT NULL,
ADD CONSTRAINT fk_billed_by FOREIGN KEY (billed_by) REFERENCES users(id) ON DELETE SET NULL;

-- 3. Billed tasks history table
CREATE TABLE IF NOT EXISTS billed_tasks (
  id INT NOT NULL AUTO_INCREMENT,
  task_id INT NOT NULL,
  task_title VARCHAR(200) NOT NULL,
  total_images INT NOT NULL,
  approved_images INT NOT NULL,
  rejected_images INT NOT NULL,
  amount_per_image DECIMAL(10,2) NOT NULL DEFAULT 4.00,
  total_amount DECIMAL(10,2) NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  billed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  billed_by INT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_task_id (task_id),
  KEY idx_billed_at (billed_at),
  CONSTRAINT fk_billed_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_billing_user FOREIGN KEY (billed_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_tasks_billed ON tasks(is_billed);

-- 4. Insert default biller user (plain text password, matching existing auth)
INSERT INTO users (username, password, role, full_name, email) 
VALUES ('biller', 'biller123', 'biller', 'Billing Department', 'billing@kggeniuslabs.com')
ON DUPLICATE KEY UPDATE role='biller';
