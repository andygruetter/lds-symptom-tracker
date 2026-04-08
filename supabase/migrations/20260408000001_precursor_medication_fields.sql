-- Vorzeichen & Medikamente als Symptom-Attribute
-- Medikamente werden nicht mehr als separater event_type erfasst,
-- sondern als Felder innerhalb von Symptom-Events (medication_index gruppiert mehrere Medikamente).
-- Vorzeichen/Vorboten werden als 'precursor'-Feld pro Symptom erfasst.

-- 1. Neue Spalte: medication_index (nullable, für Medikamenten-Felder)
ALTER TABLE extracted_data
  ADD COLUMN medication_index INTEGER DEFAULT NULL;

-- 2. Alter Unique-Index entfernen (ohne medication_index)
DROP INDEX IF EXISTS idx_extracted_data_event_field;

-- 3. Partial Unique Indexes (PostgreSQL-idiomatisch, kein Magic-Value nötig)

-- Für Nicht-Medikament-Felder (medication_index IS NULL):
CREATE UNIQUE INDEX idx_extracted_data_non_med
  ON extracted_data (symptom_event_id, field_name, symptom_index)
  WHERE medication_index IS NULL;

-- Für Medikament-Felder (medication_index IS NOT NULL):
CREATE UNIQUE INDEX idx_extracted_data_med
  ON extracted_data (symptom_event_id, field_name, symptom_index, medication_index)
  WHERE medication_index IS NOT NULL;

-- 4. Index für Medikamenten-Gruppierung (performance)
CREATE INDEX idx_extracted_data_medication_index
  ON extracted_data (symptom_event_id, medication_index);

-- 5. event_type CHECK-Constraint: 'medication' entfernen
ALTER TABLE symptom_events
  DROP CONSTRAINT IF EXISTS symptom_events_event_type_check;

ALTER TABLE symptom_events
  ADD CONSTRAINT symptom_events_event_type_check
  CHECK (event_type IN ('symptom', 'voice'));
