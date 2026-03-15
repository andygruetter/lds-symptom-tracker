-- Extraction Improvements: symptom_index + extraction_metrics
-- Unterstützt Multi-Symptom-Extraktion und Qualitäts-Tracking

-- 1. symptom_index auf extracted_data: Gruppiert Felder bei Multi-Symptom-Eingaben
ALTER TABLE public.extracted_data
  ADD COLUMN symptom_index INTEGER NOT NULL DEFAULT 0;

-- Index für effiziente Gruppierung nach Event + Symptom
CREATE INDEX idx_extracted_data_symptom_index
  ON public.extracted_data(symptom_event_id, symptom_index);

-- 2. Extraction Metrics: Qualitäts-Tracking pro Extraktion
CREATE TABLE public.extraction_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_event_id UUID NOT NULL REFERENCES public.symptom_events(id) ON DELETE CASCADE,
  account_id UUID NOT NULL,
  fields_extracted INTEGER NOT NULL DEFAULT 0,
  fields_dropped INTEGER NOT NULL DEFAULT 0,
  avg_confidence NUMERIC(5,2) NOT NULL DEFAULT 0,
  low_confidence_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS für extraction_metrics
ALTER TABLE public.extraction_metrics ENABLE ROW LEVEL SECURITY;

-- Nur Service Client schreibt (Pipeline) — kein Patient-Zugriff nötig
-- Admins könnten über ein Dashboard zugreifen (separates Policy bei Bedarf)

-- Index für Aggregations-Queries (Qualitäts-Dashboard)
CREATE INDEX idx_extraction_metrics_account_id ON public.extraction_metrics(account_id);
CREATE INDEX idx_extraction_metrics_created_at ON public.extraction_metrics(created_at DESC);
