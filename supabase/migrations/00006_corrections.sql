-- corrections: Protokolliert Patienten-Korrekturen an KI-extrahierten Daten
-- Story 2.3: Review-Ansicht mit Konfidenz-Indikatoren

CREATE TABLE public.corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symptom_event_id UUID NOT NULL REFERENCES public.symptom_events(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  original_value TEXT NOT NULL,
  corrected_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.corrections ENABLE ROW LEVEL SECURITY;

-- Patient kann eigene Korrekturen einfügen
CREATE POLICY "corrections_patient_insert" ON public.corrections
  FOR INSERT WITH CHECK (auth.uid() = account_id);

-- Patient kann eigene Korrekturen lesen
CREATE POLICY "corrections_patient_select" ON public.corrections
  FOR SELECT USING (auth.uid() = account_id);

-- Indizes für schnelle Lookups
CREATE INDEX idx_corrections_account_id ON public.corrections(account_id);
CREATE INDEX idx_corrections_symptom_event_id ON public.corrections(symptom_event_id);
