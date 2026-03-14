-- Migration 00015: Composite Index für chronologischen Feed (Story 4.1, NFR3)
-- Begründung: Die Feed-Query filtert nach account_id + status + deleted_at IS NULL
-- und sortiert nach occurred_at DESC. Einzelne Indizes reichen nicht für effiziente
-- Abfrage bei Patienten mit vielen Events über 6 Monate.

CREATE INDEX idx_symptom_events_feed
  ON public.symptom_events (account_id, status, occurred_at DESC)
  WHERE deleted_at IS NULL;
