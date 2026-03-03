-- symptom_events: Kern-Tabelle für Symptom- und Medikamenten-Events
-- Story 2.1: Chat-UI mit Text-Eingabe und ChatFeed

CREATE TABLE public.symptom_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'symptom'
    CHECK (event_type IN ('symptom', 'medication')),
  raw_input TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'extracted', 'confirmed', 'extraction_failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ DEFAULT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Row Level Security
ALTER TABLE public.symptom_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "symptom_events_patient_select" ON public.symptom_events
  FOR SELECT USING (auth.uid() = account_id AND deleted_at IS NULL);

CREATE POLICY "symptom_events_patient_insert" ON public.symptom_events
  FOR INSERT WITH CHECK (auth.uid() = account_id);

CREATE POLICY "symptom_events_patient_update" ON public.symptom_events
  FOR UPDATE USING (auth.uid() = account_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = account_id);

-- Indexes
CREATE INDEX idx_symptom_events_account_id ON public.symptom_events(account_id);
CREATE INDEX idx_symptom_events_status ON public.symptom_events(status);

-- Realtime aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE public.symptom_events;
