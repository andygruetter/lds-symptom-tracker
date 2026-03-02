-- Hard-Delete für soft-gelöschte Accounts via pg_cron
-- Löscht auth.users Rows nach 30 Tagen → CASCADE löscht accounts automatisch
-- Hinweis: pg_cron ist nur auf gehosteten Supabase-Instanzen verfügbar

-- pg_cron Extension aktivieren (auf Supabase Pro-Plan standardmässig verfügbar)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cleanup-Funktion für abgelaufene Soft-Deletes
-- SECURITY DEFINER: Läuft mit Rechten des Erstellers (postgres), nicht des Aufrufers
-- Nötig weil DELETE FROM auth.users Admin-Rechte braucht
CREATE OR REPLACE FUNCTION public.cleanup_deleted_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Lösche auth.users Rows → CASCADE löscht accounts automatisch
  -- Wenn in späteren Epics Media/Storage hinzukommt, hier erweitern
  DELETE FROM auth.users
  WHERE id IN (
    SELECT id FROM public.accounts
    WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days'
  );
END;
$$;

-- Wöchentlicher Cron-Job: Sonntag 03:00 UTC
SELECT cron.schedule(
  'cleanup-deleted-accounts',
  '0 3 * * 0',
  'SELECT public.cleanup_deleted_accounts()'
);
