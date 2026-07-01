/*
# Add product presets and notification settings

## Overview
This migration adds two tables to support:
1. Product/Service presets - Merchants can save frequently-sold items for one-click QR generation
2. Notification settings - Store merchant's WhatsApp/Telegram preferences for payment alerts

## New Tables

### 1. `product_presets`
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users) - Merchant who owns this preset
- `name` (text) - Product/service name, e.g. "Haircut", "Small Coffee"
- `amount` (numeric(12,2)) - Price of the item
- `category` (text, optional) - Grouping category, e.g. "Drinks", "Services"
- `sort_order` (int, default 0) - Display order in UI
- `is_active` (boolean, default true) - Soft delete support
- `created_at` (timestamptz)

### 2. `notification_settings`
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users, unique) - One settings row per merchant
- `whatsapp_number` (text, optional) - WhatsApp number with country code, e.g. "+1234567890"
- `telegram_chat_id` (text, optional) - Telegram chat ID for bot messages
- `notify_on_payment` (boolean, default true) - Send alert when customer pays
- `notify_on_fraud` (boolean, default true) - Send alert on fraud attempts
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## Security
- RLS enabled on both tables
- Owner-scoped CRUD for authenticated merchants only
*/

-- =========================================================
-- product_presets
-- =========================================================
CREATE TABLE IF NOT EXISTS product_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(12,2) NOT NULL,
  category text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_product_presets" ON product_presets;
CREATE POLICY "select_own_product_presets"
ON product_presets FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_product_presets" ON product_presets;
CREATE POLICY "insert_own_product_presets"
ON product_presets FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_product_presets" ON product_presets;
CREATE POLICY "update_own_product_presets"
ON product_presets FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_product_presets" ON product_presets;
CREATE POLICY "delete_own_product_presets"
ON product_presets FOR DELETE
TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS product_presets_user_id_idx ON product_presets(user_id);

-- =========================================================
-- notification_settings
-- =========================================================
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp_number text,
  telegram_chat_id text,
  notify_on_payment boolean NOT NULL DEFAULT true,
  notify_on_fraud boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_notification_settings UNIQUE (user_id)
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notification_settings" ON notification_settings;
CREATE POLICY "select_own_notification_settings"
ON notification_settings FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notification_settings" ON notification_settings;
CREATE POLICY "insert_own_notification_settings"
ON notification_settings FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notification_settings" ON notification_settings;
CREATE POLICY "update_own_notification_settings"
ON notification_settings FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notification_settings" ON notification_settings;
CREATE POLICY "delete_own_notification_settings"
ON notification_settings FOR DELETE
TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notification_settings_user_id_idx ON notification_settings(user_id);

-- =========================================================
-- Trigger: Auto-update updated_at timestamp
-- =========================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notification_settings_updated_at ON notification_settings;
CREATE TRIGGER notification_settings_updated_at
BEFORE UPDATE ON notification_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();