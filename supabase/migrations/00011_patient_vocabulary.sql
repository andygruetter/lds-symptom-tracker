-- patient_vocabulary: Persönliches Symptom-Vokabular pro Patient
-- Story 3.6: Persönliches Vokabular — automatischer Aufbau aus Korrekturen

CREATE TABLE public.patient_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_term TEXT NOT NULL,
  mapped_term TEXT NOT NULL,
  field_name TEXT NOT NULL,
  usage_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ein Mapping pro Term+Feld pro Patient (case-insensitiv, originale Schreibweise bleibt erhalten)
CREATE UNIQUE INDEX patient_vocabulary_unique_term
  ON public.patient_vocabulary (account_id, LOWER(patient_term), field_name);

-- Row Level Security
ALTER TABLE public.patient_vocabulary ENABLE ROW LEVEL SECURITY;

-- Patient kann eigenes Vokabular lesen
CREATE POLICY "vocabulary_patient_select" ON public.patient_vocabulary
  FOR SELECT USING (auth.uid() = account_id);

-- Patient kann eigenes Vokabular einfügen
CREATE POLICY "vocabulary_patient_insert" ON public.patient_vocabulary
  FOR INSERT WITH CHECK (auth.uid() = account_id);

-- Patient kann eigenes Vokabular aktualisieren
CREATE POLICY "vocabulary_patient_update" ON public.patient_vocabulary
  FOR UPDATE USING (auth.uid() = account_id);

-- Patient kann eigenes Vokabular löschen
CREATE POLICY "vocabulary_patient_delete" ON public.patient_vocabulary
  FOR DELETE USING (auth.uid() = account_id);

-- Index auf account_id für schnelle Abfragen
CREATE INDEX idx_patient_vocabulary_account_id ON public.patient_vocabulary(account_id);

-- RPC-Funktion für atomares Upsert mit Increment
CREATE OR REPLACE FUNCTION upsert_vocabulary_entry(
  p_account_id UUID,
  p_patient_term TEXT,
  p_mapped_term TEXT,
  p_field_name TEXT
) RETURNS VOID AS $$
BEGIN
  -- Sicherheitscheck: Nur eigenes Vokabular bearbeiten
  IF p_account_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: account_id mismatch';
  END IF;

  INSERT INTO patient_vocabulary (account_id, patient_term, mapped_term, field_name, usage_count)
  VALUES (p_account_id, p_patient_term, p_mapped_term, p_field_name, 1)
  ON CONFLICT (account_id, LOWER(patient_term), field_name)
  DO UPDATE SET usage_count = patient_vocabulary.usage_count + 1,
               patient_term = EXCLUDED.patient_term,
               mapped_term = EXCLUDED.mapped_term,
               updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
