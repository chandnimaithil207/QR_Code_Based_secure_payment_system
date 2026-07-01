/*
# Add notification triggers for payments and fraud

## Overview
This migration creates database triggers that automatically call the payment-notification
edge function when:
1. A new verified transaction is inserted (payment notification)
2. A new fraud log is inserted (fraud alert notification)

## Functions Created
- `notify_payment()` - Called after INSERT on transactions table
- `notify_fraud()` - Called after INSERT on fraud_logs table

Both functions use pg_net extension or pg_cron to make HTTP requests to the edge function.
Since Supabase doesn't have pg_net available by default, we use a simpler approach:
store pending notifications in a table and process them.

## New Table
- `pending_notifications` - Stores notifications to be processed
  - `id` (uuid, PK)
  - `payload` (jsonb) - Notification data
  - `type` (text) - 'payment' or 'fraud'
  - `processed` (boolean, default false)
  - `created_at` (timestamptz)

The frontend will poll this table or we can use Supabase realtime to trigger
the edge function call from the client side.
*/

-- =========================================================
-- pending_notifications table
-- =========================================================
CREATE TABLE IF NOT EXISTS pending_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payload jsonb NOT NULL,
  type text NOT NULL CHECK (type IN ('payment', 'fraud')),
  processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pending_notifications_processed_idx ON pending_notifications(processed) WHERE processed = false;

-- =========================================================
-- Trigger: Queue payment notification
-- =========================================================
CREATE OR REPLACE FUNCTION queue_payment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify on verified transactions
  IF NEW.status = 'verified' THEN
    INSERT INTO pending_notifications (type, payload)
    VALUES (
      'payment',
      jsonb_build_object(
        'transactionId', NEW.transaction_id,
        'merchantId', NEW.user_id,
        'amount', NEW.amount,
        'customerName', NEW.customer_name,
        'orderId', NEW.order_id,
        'type', 'payment'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_queue_notification ON transactions;
CREATE TRIGGER transactions_queue_notification
AFTER INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION queue_payment_notification();

-- =========================================================
-- Trigger: Queue fraud notification
-- =========================================================
CREATE OR REPLACE FUNCTION queue_fraud_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO pending_notifications (type, payload)
  VALUES (
    'fraud',
    jsonb_build_object(
      'transactionId', NEW.transaction_id,
      'merchantId', NEW.user_id,
      'fraudDetails', jsonb_build_object(
        'fraudType', NEW.fraud_type,
        'description', NEW.description
      ),
      'type', 'fraud'
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fraud_logs_queue_notification ON fraud_logs;
CREATE TRIGGER fraud_logs_queue_notification
AFTER INSERT ON fraud_logs
FOR EACH ROW EXECUTE FUNCTION queue_fraud_notification();