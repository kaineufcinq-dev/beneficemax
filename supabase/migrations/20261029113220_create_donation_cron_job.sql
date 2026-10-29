/*
# Create cron schedule for donation tracking

1. Purpose
- Schedules the `donation-tracker` edge function to run every 5 minutes.
- Uses pg_cron to call the edge function via its HTTP endpoint.
- The edge function scrapes the OnParticipe cagnotte page, compares with the last snapshot,
  and sends a Telegram notification if a new donation is detected.

2. Changes
- Enables the pg_cron extension if not already enabled.
- Creates a cron job named 'check-donations' that runs every 5 minutes.
- The job sends a GET request to the edge function endpoint using net.http_post.
- Uses the anon key for authorization.
*/

-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  -- Drop existing job if it exists
  PERFORM cron.unschedule('check-donations');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Get the project URL and anon key from the vault/settings
-- The cron job calls the edge function every 5 minutes
SELECT cron.schedule(
  'check-donations',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := (SELECT value FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/donation-tracker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY')
      ),
      body := '{}'::jsonb
    );
  $$
);
