-- Campanhas marketing: cron horário (promo almoço, fim-de-semana, fila agendada)
-- Substitui o job diário por execução de hora em hora via process-scheduled-campaigns.

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE WARNING 'pg_cron não disponível — configure cron externo para process-scheduled-campaigns';
    RETURN;
  END IF;

  FOR v_job_id IN
    SELECT jobid FROM cron.job
    WHERE jobname IN ('kebabturco-marketing-campaigns-daily', 'kebabturco-marketing-campaigns-hourly')
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;

  PERFORM cron.schedule(
    'kebabturco-marketing-campaigns-hourly',
    '5 * * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://kvpssbhclafoymhecmuk.supabase.co/functions/v1/process-scheduled-campaigns',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{"cron": true}'::jsonb
    );
    $cron$
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'pg_cron marketing hourly skipped: %', SQLERRM;
END;
$$;
