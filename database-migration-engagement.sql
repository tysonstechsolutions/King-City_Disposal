-- ============================================
-- ENGAGEMENT FEATURES MIGRATION
-- ============================================
-- Adds columns for review requests and service reminders
-- Run this in Supabase SQL Editor

-- Add review_request_sent to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS review_request_sent TIMESTAMP WITH TIME ZONE;

-- Add service_reminder_sent and last_booking_date to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS service_reminder_sent TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_booking_date DATE;

-- Create a function to update last_booking_date when bookings are completed
CREATE OR REPLACE FUNCTION update_customer_last_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- When a booking is marked as picked_up, update the customer's last_booking_date
  IF NEW.status = 'picked_up' AND (OLD.status IS NULL OR OLD.status != 'picked_up') THEN
    UPDATE customers
    SET last_booking_date = CURRENT_DATE,
        service_reminder_sent = NULL  -- Reset so they can get another reminder later
    WHERE id = NEW.customer_id OR phone = NEW.customer_phone;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update last_booking_date
DROP TRIGGER IF EXISTS update_customer_last_booking_trigger ON bookings;
CREATE TRIGGER update_customer_last_booking_trigger
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_customer_last_booking();

-- Backfill last_booking_date for existing customers
UPDATE customers c
SET last_booking_date = (
  SELECT MAX(b.delivery_date)
  FROM bookings b
  WHERE b.customer_phone = c.phone
    AND b.status IN ('picked_up', 'delivered', 'completed')
)
WHERE c.last_booking_date IS NULL;

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_bookings_review_request ON bookings(status, review_request_sent, updated_at);
CREATE INDEX IF NOT EXISTS idx_customers_service_reminder ON customers(service_reminder_sent, last_booking_date);

-- Verify columns were added
SELECT
  'bookings.review_request_sent' as column_check,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'review_request_sent'
  ) as exists;

SELECT
  'customers.service_reminder_sent' as column_check,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'service_reminder_sent'
  ) as exists;

SELECT
  'customers.last_booking_date' as column_check,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'last_booking_date'
  ) as exists;
