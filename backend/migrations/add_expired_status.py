-- Add 'expired' status to order_status ENUM
-- MySQL: ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'preparing', 'ready', 'completed', 'cancelled', 'multi_store_pending', 'expired');

-- For MySQL, you need to recreate the ENUM
ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'preparing', 'ready', 'completed', 'cancelled', 'multi_store_pending', 'expired') NOT NULL DEFAULT 'pending';
