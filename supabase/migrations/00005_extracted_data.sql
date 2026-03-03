-- extracted_data: Extrahierte strukturierte Daten aus KI-Pipeline
-- Story 2.2: KI-Extraktion und Klassifikation

CREATE TABLE public.extracted_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_event_id UUID NOT NULL REFERENCES public.symptom_events(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence NUMERIC(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.extracted_data ENABLE ROW LEVEL SECURITY;

-- Patient kann eigene extrahierte Daten lesen
CREATE POLICY "extracted_data_patient_select" ON public.extracted_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.symptom_events
      WHERE symptom_events.id = extracted_data.symptom_event_id
        AND symptom_events.account_id = auth.uid()
        AND symptom_events.deleted_at IS NULL
    )
  );

-- Service Client (KI-Pipeline) darf Daten einfügen (RLS bypassed via service_role)
-- Kein expliziter INSERT-Policy nötig — createServiceClient() umgeht RLS

-- Patient kann Felder bestätigen/korrigieren (Story 2.3)
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

-- Index für schnelle Lookups per Event
CREATE INDEX idx_extracted_data_symptom_event_id ON public.extracted_data(symptom_event_id);

-- Realtime aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE public.extracted_data;
