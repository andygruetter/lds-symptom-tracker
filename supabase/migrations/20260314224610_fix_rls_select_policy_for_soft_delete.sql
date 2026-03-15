-- Fix: PostgreSQL applies SELECT USING to the NEW row after UPDATE.
-- Setting deleted_at to non-NULL causes the row to fail the SELECT policy
-- (deleted_at IS NULL), which blocks soft-delete updates.
--
-- Solution: Remove deleted_at IS NULL from SELECT policy.
-- RLS handles authorization (who), application queries handle business logic
-- (deleted_at IS NULL filter is in all application queries already).

DROP POLICY IF EXISTS "symptom_events_patient_select" ON public.symptom_events;
CREATE POLICY "symptom_events_patient_select" ON public.symptom_events
  FOR SELECT USING (auth.uid() = account_id);
