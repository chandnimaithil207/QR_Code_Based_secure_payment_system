-- Customer payment page inserts transactions with no logged-in user.
-- The customer is anonymous; the merchant's user_id comes from the qr_code.
-- Make user_id nullable so the anon insert can succeed.
ALTER TABLE transactions ALTER COLUMN user_id DROP NOT NULL;
