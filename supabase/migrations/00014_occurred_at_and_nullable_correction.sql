-- Migration 00014: occurred_at auf symptom_events + corrections.original_value nullable + INSERT RLS
-- Tech-Spec: Extraktion Symptomzeit und Dauer mit Edit-Screen

-- 1a) occurred_at auf symptom_events als abgeleitetes Feld
-- PostgreSQL erlaubt kein DEFAULT other_column → DEFAULT now() + Backfill + NOT NULL
ALTER TABLE public.symptom_events ADD COLUMN occurred_at TIMESTAMPTZ DEFAULT now();
UPDATE public.symptom_events SET occurred_at = created_at;
ALTER TABLE public.symptom_events ALTER COLUMN occurred_at SET NOT NULL;

-- Index für effiziente Queries nach Zeitpunkt
CREATE INDEX idx_symptom_events_occurred_at ON public.symptom_events(occurred_at);

-- RLS: Bestehende SELECT/UPDATE Policies auf symptom_events decken occurred_at automatisch ab

-- 1b) corrections.original_value nullable machen (F1-Fix)
-- Begründung: Nacherfassung eines neuen Feldes hat keinen Original-Wert → NULL ist korrekt
ALTER TABLE public.corrections ALTER COLUMN original_value DROP NOT NULL;

-- 1c) INSERT RLS-Policy auf extracted_data für Patient (F2-Fix)
-- Begründung: correctExtractedField() nutzt createServerClient() (mit RLS).
-- Aktuell existieren nur SELECT/UPDATE Policies. INSERT für Nacherfassung braucht eigenen Policy.
CREATE POLICY "extracted_data_patient_insert" ON public.extracted_data
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.symptom_events
      WHERE symptom_events.id = extracted_data.symptom_event_id
        AND symptom_events.account_id = auth.uid()
        AND symptom_events.deleted_at IS NULL
    )
  );
