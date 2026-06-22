-- Change expiry_time from text to timestamptz so expiry comparisons are correct
-- across dates, not just within a single day.
ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Back-fill existing rows: if expiry_time is a time-only string we can't
-- reliably recover the original date, so just mark them expired.
UPDATE qr_codes
  SET expires_at = now() - interval '1 second'
  WHERE expires_at IS NULL;

ALTER TABLE qr_codes
  ALTER COLUMN expires_at SET NOT NULL,
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '15 minutes');
