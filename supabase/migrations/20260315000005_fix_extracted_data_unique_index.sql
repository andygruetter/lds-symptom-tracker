-- Fix: Unique index muss symptom_index einschliessen für Multi-Symptom-Events
-- Vorher: (symptom_event_id, field_name) → schlägt fehl bei 2+ Symptomen pro Event
-- Nachher: (symptom_event_id, field_name, symptom_index) → erlaubt mehrere Symptome

DROP INDEX IF EXISTS idx_extracted_data_event_field;

CREATE UNIQUE INDEX idx_extracted_data_event_field
  ON extracted_data (symptom_event_id, field_name, symptom_index);
