-- push_subscriptions: Speichert Web Push Subscriptions pro Account/Device
-- Story 3.4: Push-Benachrichtigung nach KI-Verarbeitung

CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  keys_p256dh TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_account_endpoint_unique UNIQUE (account_id, endpoint)
);

-- Row Level Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Patient kann eigene Subscriptions einfügen
CREATE POLICY "push_subscriptions_patient_insert" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = account_id);

-- Patient kann eigene Subscriptions lesen
CREATE POLICY "push_subscriptions_patient_select" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = account_id);

-- Patient kann eigene Subscriptions aktualisieren (nötig für Upsert ON CONFLICT)
CREATE POLICY "push_subscriptions_patient_update" ON public.push_subscriptions
  FOR UPDATE USING (auth.uid() = account_id);

-- Patient kann eigene Subscriptions löschen
CREATE POLICY "push_subscriptions_patient_delete" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = account_id);

-- Index für schnelle Abfrage beim Notification-Versand
CREATE INDEX idx_push_subscriptions_account_id ON public.push_subscriptions(account_id);
