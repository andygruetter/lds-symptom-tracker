-- Event-Photos: Foto-Dokumentation zu Symptom-Events
-- Story 3.3: Foto-Upload zu Symptom-Events

-- 1. event_photos Tabelle erstellen
CREATE TABLE public.event_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_event_id UUID NOT NULL REFERENCES public.symptom_events(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Index auf symptom_event_id für schnelle Abfragen
CREATE INDEX idx_event_photos_symptom_event_id ON public.event_photos(symptom_event_id);

-- 3. RLS aktivieren
ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

-- 4. RLS-Policy: Patient sieht nur eigene Fotos
CREATE POLICY "event_photos_patient_select" ON public.event_photos
  FOR SELECT
  USING (
    auth.uid() = (SELECT account_id FROM public.symptom_events WHERE id = symptom_event_id)
  );

CREATE POLICY "event_photos_patient_insert" ON public.event_photos
  FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT account_id FROM public.symptom_events WHERE id = symptom_event_id)
  );

CREATE POLICY "event_photos_patient_delete" ON public.event_photos
  FOR DELETE
  USING (
    auth.uid() = (SELECT account_id FROM public.symptom_events WHERE id = symptom_event_id)
  );

-- 5. Storage Bucket 'photos' erstellen (private, 10MB Limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage RLS Policies: Patient kann eigene Fotos verwalten
-- Pfad-Schema: {account_id}/{event_id}/{timestamp}-{filename}
CREATE POLICY "photos_patient_upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "photos_patient_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "photos_patient_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
