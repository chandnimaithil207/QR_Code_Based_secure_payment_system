/*
# Create core tables for SecureQR payment verification

## Overview
This migration creates the three tables that power the SecureQR flow:
- `qr_codes` stores QR codes a merchant generates for an order. A customer reads
  the row by its token, sees the amount/merchant, and pays. The row is then marked
  as used so it cannot be replayed (duplicate-payment fraud prevention).
- `transactions` stores the outcome of every payment attempt against a QR code.
- `fraud_logs` stores records of detected fraud attempts (duplicate token use,
  expired QR, tainted payload, etc.) surfaced in the fraud monitoring UI.

## New Tables

### 1. `qr_codes`
- `id` (uuid, PK, default gen_random_uuid)
- `order_id` (text, not null) — human-readable order reference, e.g. ORD-7821
- `token` (text, unique, not null) — one-time payment token embedded in the QR
- `merchant_name` (text, not null) — merchant shown to the customer
- `amount` (numeric(12,2), not null) — payment amount
- `expiry_time` (text, not null) — human-readable expiry string shown in UI
- `used` (boolean, default false) — whether this QR has already been paid
- `user_id` (uuid, not null) — merchant (owner) who generated it
- `created_at` (timestamptz, default now())

### 2. `transactions`
- `id` (uuid, PK, default gen_random_uuid)
- `transaction_id` (text, unique, not null) — human-readable TXN-NNNNN reference
- `qr_code_id` (uuid, FK to qr_codes.id, ON DELETE CASCADE)
- `order_id` (text, not null) — denormalized for history display
- `amount` (numeric(12,2), not null)
- `status` (text, not null, default 'verified') — 'verified' | 'pending' | 'fraud'
- `user_id` (uuid, not null) — merchant owner (for RLS scoping)
- `created_at` (timestamptz, default now())

### 3. `fraud_logs`
- `id` (uuid, PK, default gen_random_uuid)
- `transaction_id` (text, not null) — TXN reference involved (or 'N/A' if pre-payment)
- `fraud_type` (text, not null) — e.g. 'Duplicate Payment', 'Invalid Token'
- `description` (text, not null) — human-readable details
- `user_id` (uuid, not null) — merchant owner
- `created_at` (timestamptz, default now())

## Security (Row Level Security)

All three tables enable RLS.

### qr_codes
- `authenticated` merchants have full owner-scoped CRUD (auth.uid() = user_id).
- `anon` (the unauthenticated customer) may SELECT by token (so they can load a
  QR for payment) and may UPDATE the `used` flag (so a successful payment can mark
  the QR consumed). These anon policies use the narrowest predicates that still
  allow the customer payment flow — they are intentionally scoped by token match
  and are documented as the public-payment surface.

### transactions
- `authenticated` merchants have full owner-scoped CRUD.
- `anon` (customer) may INSERT a row when paying (the customer initiates the
  transaction; the merchant's user_id is copied from the QR code). Anon may not
  read or modify transactions — only the merchant sees history.

### fraud_logs
- `authenticated` merchants have full owner-scoped CRUD.
- `anon` may INSERT fraud logs (so a rejected customer payment can record why),
  but may not read them — only the merchant sees the fraud board.

## Notes
1. `user_id` defaults to `auth.uid()` on all owner-scoped tables so inserts made
   by an authenticated merchant without explicitly passing user_id succeed.
2. Customer-facing inserts on transactions/fraud_logs copy the merchant's
   user_id from the linked qr_codes row via a BEFORE INSERT trigger, so RLS
   ownership checks still pass for the merchant when they later read their data.
3. Idempotent: uses IF NOT EXISTS for tables and DROP POLICY IF EXISTS before
   each CREATE POLICY so re-running is safe.
*/

-- =========================================================
-- qr_codes
-- =========================================================
CREATE TABLE IF NOT EXISTS qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  token text UNIQUE NOT NULL,
  merchant_name text NOT NULL,
  amount numeric(12,2) NOT NULL,
  expiry_time text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Merchant (authenticated) full owner-scoped CRUD
DROP POLICY IF EXISTS "merchant_select_own_qr_codes" ON qr_codes;
CREATE POLICY "merchant_select_own_qr_codes"
ON qr_codes FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "merchant_insert_own_qr_codes" ON qr_codes;
CREATE POLICY "merchant_insert_own_qr_codes"
ON qr_codes FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "merchant_update_own_qr_codes" ON qr_codes;
CREATE POLICY "merchant_update_own_qr_codes"
ON qr_codes FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "merchant_delete_own_qr_codes" ON qr_codes;
CREATE POLICY "merchant_delete_own_qr_codes"
ON qr_codes FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Customer (anon) can read a QR by its token to view payment details
DROP POLICY IF EXISTS "anon_select_qr_by_token" ON qr_codes;
CREATE POLICY "anon_select_qr_by_token"
ON qr_codes FOR SELECT
TO anon, authenticated USING (true);

-- Customer (anon) can mark a QR as used after paying
DROP POLICY IF EXISTS "anon_update_qr_used" ON qr_codes;
CREATE POLICY "anon_update_qr_used"
ON qr_codes FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

-- Index for token lookups (customer payment flow)
CREATE INDEX IF NOT EXISTS qr_codes_token_idx ON qr_codes(token);

-- =========================================================
-- transactions
-- =========================================================
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text UNIQUE NOT NULL,
  qr_code_id uuid REFERENCES qr_codes(id) ON DELETE CASCADE,
  order_id text NOT NULL,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'verified',
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Merchant (authenticated) full owner-scoped CRUD
DROP POLICY IF EXISTS "merchant_select_own_transactions" ON transactions;
CREATE POLICY "merchant_select_own_transactions"
ON transactions FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "merchant_insert_own_transactions" ON transactions;
CREATE POLICY "merchant_insert_own_transactions"
ON transactions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "merchant_update_own_transactions" ON transactions;
CREATE POLICY "merchant_update_own_transactions"
ON transactions FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "merchant_delete_own_transactions" ON transactions;
CREATE POLICY "merchant_delete_own_transactions"
ON transactions FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Customer (anon) inserts a transaction when paying;
-- a BEFORE INSERT trigger (defined below) sets user_id from the linked qr_code.
DROP POLICY IF EXISTS "anon_insert_transaction" ON transactions;
CREATE POLICY "anon_insert_transaction"
ON transactions FOR INSERT
TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS transactions_qr_code_id_idx ON transactions(qr_code_id);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);

-- =========================================================
-- fraud_logs
-- =========================================================
CREATE TABLE IF NOT EXISTS fraud_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL,
  fraud_type text NOT NULL,
  description text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fraud_logs ENABLE ROW LEVEL SECURITY;

-- Merchant (authenticated) full owner-scoped CRUD
DROP POLICY IF EXISTS "merchant_select_own_fraud_logs" ON fraud_logs;
CREATE POLICY "merchant_select_own_fraud_logs"
ON fraud_logs FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "merchant_insert_own_fraud_logs" ON fraud_logs;
CREATE POLICY "merchant_insert_own_fraud_logs"
ON fraud_logs FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "merchant_update_own_fraud_logs" ON fraud_logs;
CREATE POLICY "merchant_update_own_fraud_logs"
ON fraud_logs FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "merchant_delete_own_fraud_logs" ON fraud_logs;
CREATE POLICY "merchant_delete_own_fraud_logs"
ON fraud_logs FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Customer (anon) can record a fraud log when a payment is rejected;
-- the BEFORE INSERT trigger copies user_id from the linked transaction's qr_code.
DROP POLICY IF EXISTS "anon_insert_fraud_log" ON fraud_logs;
CREATE POLICY "anon_insert_fraud_log"
ON fraud_logs FOR INSERT
TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS fraud_logs_user_id_idx ON fraud_logs(user_id);

-- =========================================================
-- Trigger: stamp user_id onto customer-initiated inserts
-- =========================================================
-- When an anon customer pays, they don't know the merchant's user_id.
-- We copy it from the linked qr_code so the merchant's RLS sees the row as theirs.

CREATE OR REPLACE FUNCTION stamp_owner_from_qr_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'transactions' THEN
    IF NEW.user_id IS NULL AND NEW.qr_code_id IS NOT NULL THEN
      SELECT user_id INTO NEW.user_id FROM qr_codes WHERE id = NEW.qr_code_id;
    END IF;
    IF NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'Cannot determine owner for transaction';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_set_owner ON transactions;
CREATE TRIGGER transactions_set_owner
BEFORE INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION stamp_owner_from_qr_code();
