/*
# Add customer_name to transactions + screenshot_verifications table

## Overview
Two small schema additions to support the corrected payment + screenshot verification flow:

1. `transactions.customer_name` (text) — the name the customer enters when paying.
   Shown in the merchant's transaction history and validated during screenshot verification.

2. New `screenshot_verifications` table — one row per screenshot verification attempt.
   Lets the merchant audit who verified what and when, and ties the verification to the
   underlying transaction via transaction_id. Owner-scoped to the merchant.

## Changes

### transactions (ALTER)
- ADD COLUMN `customer_name` text (nullable — older mock rows don't have it; new ones will).

### screenshot_verifications (NEW)
- `id` uuid PK
- `transaction_id` text NOT NULL — the TXN-NNNNN the merchant entered from the screenshot
- `submitted_amount` text NOT NULL — amount parsed/typed from the screenshot
- `matched` boolean NOT NULL — whether a transactions row with that id + amount exists
- `customer_name` text — customer name of the matched transaction (null if no match)
- `user_id` uuid NOT NULL DEFAULT auth.uid() — merchant owner
- `created_at` timestamptz DEFAULT now()

RLS: merchant full owner-scoped CRUD (4 policies), same pattern as the other tables.

## Notes
- Uses IF NOT EXISTS on the column add (idempotent — safe to re-run since a prior
  attempt may have timed out after committing).
- DROP POLICY IF EXISTS before each CREATE POLICY (idempotent).
*/

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS customer_name text;

CREATE TABLE IF NOT EXISTS screenshot_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL,
  submitted_amount text NOT NULL,
  matched boolean NOT NULL,
  customer_name text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE screenshot_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "merchant_select_own_screenshot_verifications" ON screenshot_verifications;
CREATE POLICY "merchant_select_own_screenshot_verifications"
ON screenshot_verifications FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "merchant_insert_own_screenshot_verifications" ON screenshot_verifications;
CREATE POLICY "merchant_insert_own_screenshot_verifications"
ON screenshot_verifications FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "merchant_update_own_screenshot_verifications" ON screenshot_verifications;
CREATE POLICY "merchant_update_own_screenshot_verifications"
ON screenshot_verifications FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "merchant_delete_own_screenshot_verifications" ON screenshot_verifications;
CREATE POLICY "merchant_delete_own_screenshot_verifications"
ON screenshot_verifications FOR DELETE
TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS screenshot_verifications_user_id_idx ON screenshot_verifications(user_id);
