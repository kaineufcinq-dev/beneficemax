/*
# Create donation tracking table for OnParticipe cagnotte

1. New Tables
- `donation_snapshots`
  - `id` (uuid, primary key)
  - `cagnotte_url` (text, the OnParticipe cagnotte URL being monitored)
  - `amount_cents` (integer, total collected amount in cents)
  - `participant_count` (integer, number of participants)
  - `checked_at` (timestamptz, when the snapshot was taken)

2. Purpose
- Stores periodic snapshots of the OnParticipe cagnotte state (amount + participant count).
- The edge function reads the latest snapshot, scrapes the page, compares, and if
  the amount or participant count increased, sends a Telegram notification and inserts a new row.

3. Security
- Enable RLS on `donation_snapshots`.
- Grant CRUD to `service_role` (edge function uses the service role key).
- Grant SELECT to `anon, authenticated` so the frontend (if built later) can display the history.
- No user-scoped ownership: this is a single-tenant monitoring table.
*/

CREATE TABLE IF NOT EXISTS donation_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cagnotte_url text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  participant_count integer NOT NULL DEFAULT 0,
  checked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE donation_snapshots ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON donation_snapshots TO service_role;
GRANT SELECT ON donation_snapshots TO anon, authenticated;

DROP POLICY IF EXISTS "anon_read_snapshots" ON donation_snapshots;
CREATE POLICY "anon_read_snapshots" ON donation_snapshots
  FOR SELECT TO anon, authenticated USING (true);
