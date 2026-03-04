-- Transkription-Status: 'transcribed' und 'transcription_failed' hinzufügen
-- Story 3.2: Schweizerdeutsch-Transkription via Whisper API

-- Status-CHECK-Constraint erweitern um neue Werte
ALTER TABLE public.symptom_events
  DROP CONSTRAINT IF EXISTS symptom_events_status_check;

ALTER TABLE public.symptom_events
  ADD CONSTRAINT symptom_events_status_check
  CHECK (status IN ('pending', 'transcribed', 'extracted', 'confirmed', 'extraction_failed', 'transcription_failed'));
