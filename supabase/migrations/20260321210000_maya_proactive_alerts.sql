-- Maya Proactive Alerts: audit table to avoid sending duplicate alerts
CREATE TABLE IF NOT EXISTS public.maya_proactive_alerts_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  alert_hash TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, alert_type, alert_hash)
);

CREATE INDEX idx_maya_alerts_company
  ON public.maya_proactive_alerts_sent(company_id, sent_at DESC);

-- pg_cron schedule: run maya-proactive-scheduler daily at 14:00 UTC (9 AM Colombia)
-- Note: pg_cron extension must be enabled in Supabase project settings
-- The URL and service role key must be set as project secrets
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'maya-proactive-daily',
      '0 14 * * *',
      $cron$
      SELECT net.http_post(
        url := current_setting('app.supabase_url', true) || '/functions/v1/maya-proactive-scheduler',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        ),
        body := '{}'::jsonb
      )
      $cron$
    );
  END IF;
END $$;
