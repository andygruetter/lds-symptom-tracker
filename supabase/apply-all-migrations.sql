-- ============================================================
-- ALLE MIGRATIONEN KOMBINIERT — einmalig im Supabase SQL Editor ausführen
-- ============================================================

-- ==================== 00001: Accounts ====================
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own account"
  ON public.accounts FOR SELECT
  USING (auth.uid() = id AND deleted_at IS NULL);

CREATE POLICY "Users can update own account"
  ON public.accounts FOR UPDATE
  USING (auth.uid() = id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users"
  ON public.accounts FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger: Auto-Create Account bei neuem Auth-User
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.accounts (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Account-Rows für BESTEHENDE User anlegen (falls schon User existieren)
INSERT INTO public.accounts (id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT id FROM public.accounts)
ON CONFLICT (id) DO NOTHING;

-- ==================== 00002: Disclaimer ====================
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS disclaimer_accepted_at TIMESTAMPTZ DEFAULT NULL;

-- ==================== 00003: Hard-Delete Cron ====================
-- pg_cron ist optional (Pro-Plan). Falls es fehlschlägt, einfach ignorieren.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron nicht verfügbar — Cron-Job wird übersprungen';
END $$;

CREATE OR REPLACE FUNCTION public.cleanup_deleted_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users
  WHERE id IN (
    SELECT id FROM public.accounts
    WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days'
  );
END;
$$;

-- Cron-Job nur wenn pg_cron verfügbar
DO $$
BEGIN
  PERFORM cron.schedule(
    'cleanup-deleted-accounts',
    '0 3 * * 0',
    'SELECT public.cleanup_deleted_accounts()'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Cron-Job übersprungen (pg_cron nicht verfügbar)';
END $$;

-- ==================== 00004: Symptom Events ====================
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

ALTER TABLE public.symptom_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "symptom_events_patient_select" ON public.symptom_events
  FOR SELECT USING (auth.uid() = account_id AND deleted_at IS NULL);

CREATE POLICY "symptom_events_patient_insert" ON public.symptom_events
  FOR INSERT WITH CHECK (auth.uid() = account_id);

CREATE POLICY "symptom_events_patient_update" ON public.symptom_events
  FOR UPDATE USING (auth.uid() = account_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = account_id);

CREATE INDEX idx_symptom_events_account_id ON public.symptom_events(account_id);
CREATE INDEX idx_symptom_events_status ON public.symptom_events(status);

ALTER PUBLICATION supabase_realtime ADD TABLE public.symptom_events;

-- ==================== 00005: Extracted Data ====================
CREATE TABLE public.extracted_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_event_id UUID NOT NULL REFERENCES public.symptom_events(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence NUMERIC(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.extracted_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "extracted_data_patient_select" ON public.extracted_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.symptom_events
      WHERE symptom_events.id = extracted_data.symptom_event_id
        AND symptom_events.account_id = auth.uid()
        AND symptom_events.deleted_at IS NULL
    )
  );

CREATE POLICY "extracted_data_patient_update" ON public.extracted_data
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.symptom_events
      WHERE symptom_events.id = extracted_data.symptom_event_id
        AND symptom_events.account_id = auth.uid()
        AND symptom_events.deleted_at IS NULL
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.symptom_events
      WHERE symptom_events.id = extracted_data.symptom_event_id
        AND symptom_events.account_id = auth.uid()
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.extracted_data;

-- ==================== 00006: Corrections ====================
CREATE TABLE public.corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symptom_event_id UUID NOT NULL REFERENCES public.symptom_events(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  original_value TEXT NOT NULL,
  corrected_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "corrections_patient_insert" ON public.corrections
  FOR INSERT WITH CHECK (auth.uid() = account_id);

CREATE POLICY "corrections_patient_select" ON public.corrections
  FOR SELECT USING (auth.uid() = account_id);

CREATE INDEX idx_corrections_account_id ON public.corrections(account_id);
CREATE INDEX idx_corrections_symptom_event_id ON public.corrections(symptom_event_id);

-- ==================== 00007: Compound Index ====================
CREATE UNIQUE INDEX idx_extracted_data_event_field
  ON public.extracted_data(symptom_event_id, field_name);
