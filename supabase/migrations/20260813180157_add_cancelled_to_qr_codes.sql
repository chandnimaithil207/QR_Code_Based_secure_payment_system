/*
# Add cancelled column to qr_codes

## Purpose
Merchants need the ability to cancel a pending QR code so it can no longer be
used for payment. Previously a QR could only be "used" or "expired" — there was
no way for a merchant to proactively revoke a QR they no longer want to accept
payment on. This adds a `cancelled` boolean column defaulting to false.

## Changes
- Adds `cancelled` boolean NOT NULL DEFAULT false to `qr_codes`.
- No new tables, no policy changes (existing RLS policies already cover UPDATE
  by the authenticated owner, so the merchant can set cancelled = true on their
  own rows; the anon UPDATE policy already allows updating any column).

## Security
- No RLS policy changes needed. The existing `merchant_update_own_qr_codes`
  policy already allows the owner to UPDATE any column on their own rows.
  The existing `anon_update_qr_used` policy allows anon to UPDATE any column
  (this is the public payment surface — already documented in the original
  migration).
*/

ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS cancelled boolean NOT NULL DEFAULT false;