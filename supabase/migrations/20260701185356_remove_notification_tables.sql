/*
# Remove notification tables and triggers

## Overview
This migration removes the WhatsApp/Telegram notification feature entirely:
- Drops triggers that queue notifications
- Drops functions that queue notifications
- Drops the pending_notifications table
- Drops the notification_settings table

## Tables Removed
- `pending_notifications` - Was used to queue notification requests
- `notification_settings` - Was used to store merchant notification preferences

## Triggers Removed
- `transactions_queue_notification` on transactions table
- `fraud_logs_queue_notification` on fraud_logs table

## Functions Removed
- `queue_payment_notification()`
- `queue_fraud_notification()`
- `update_updated_at_column()`
*/

-- Drop triggers first
DROP TRIGGER IF EXISTS transactions_queue_notification ON transactions;
DROP TRIGGER IF EXISTS fraud_logs_queue_notification ON fraud_logs;
DROP TRIGGER IF EXISTS notification_settings_updated_at ON notification_settings;

-- Drop functions
DROP FUNCTION IF EXISTS queue_payment_notification();
DROP FUNCTION IF EXISTS queue_fraud_notification();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (order matters due to potential dependencies)
DROP TABLE IF EXISTS pending_notifications;
DROP TABLE IF EXISTS notification_settings;