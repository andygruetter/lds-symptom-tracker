-- Compound-Index für Lookups per Event + Feld
-- Ersetzt den einfachen Index auf symptom_event_id
-- Story 2.2 Code Review: L2

DROP INDEX IF EXISTS idx_extracted_data_symptom_event_id;

CREATE UNIQUE INDEX idx_extracted_data_event_field
  ON public.extracted_data(symptom_event_id, field_name);
