-- Hard-Delete für soft-gelöschte Events via pg_cron
-- Löscht verknüpfte Daten (extracted_data, event_photos, corrections) und Events nach 30 Tagen
-- Storage-Dateien (Audio, Fotos) werden NICHT gelöscht (benötigt HTTP API, Post-MVP)

CREATE OR REPLACE FUNCTION public.cleanup_deleted_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_event_ids UUID[];
BEGIN
  -- Sammle IDs der zu löschenden Events
  SELECT array_agg(id) INTO deleted_event_ids
  FROM public.symptom_events
  WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL '30 days';

  -- Nichts zu tun?
  IF deleted_event_ids IS NULL THEN
    RETURN;
  END IF;

  -- Lösche verknüpfte Daten
  DELETE FROM public.extracted_data
  WHERE symptom_event_id = ANY(deleted_event_ids);

  DELETE FROM public.event_photos
  WHERE symptom_event_id = ANY(deleted_event_ids);

  DELETE FROM public.corrections
  WHERE symptom_event_id = ANY(deleted_event_ids);

  -- Lösche die Events selbst
  DELETE FROM public.symptom_events
  WHERE id = ANY(deleted_event_ids);
END;
$$;

-- Wöchentlicher Cron-Job: Sonntag 03:30 UTC (30 Min nach Account-Cleanup)
SELECT cron.schedule(
  'cleanup-deleted-events',
  '30 3 * * 0',
  'SELECT public.cleanup_deleted_events()'
);
