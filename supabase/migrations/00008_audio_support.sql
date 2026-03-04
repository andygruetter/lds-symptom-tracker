-- Audio-Support: audio_url Spalte + event_type 'voice' + Storage Bucket
-- Story 3.1: Hold-to-Record Audio-Erfassung

-- 1. audio_url Spalte zu symptom_events hinzufügen
ALTER TABLE public.symptom_events
  ADD COLUMN audio_url TEXT DEFAULT NULL;

-- 2. event_type CHECK-Constraint um 'voice' erweitern
-- Bestehenden Constraint droppen und neu erstellen
ALTER TABLE public.symptom_events
  DROP CONSTRAINT IF EXISTS symptom_events_event_type_check;

ALTER TABLE public.symptom_events
  ADD CONSTRAINT symptom_events_event_type_check
  CHECK (event_type IN ('symptom', 'medication', 'voice'));

-- 3. raw_input optional machen für Voice-Events (Audio-only, Transkription kommt in Story 3.2)
ALTER TABLE public.symptom_events
  ALTER COLUMN raw_input DROP NOT NULL;

-- 4. Storage Bucket 'audio' erstellen (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio',
  'audio',
  false,
  52428800, -- 50MB
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']
)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS Policies: Patient kann eigene Audio-Dateien verwalten
CREATE POLICY "audio_patient_upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "audio_patient_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "audio_patient_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
