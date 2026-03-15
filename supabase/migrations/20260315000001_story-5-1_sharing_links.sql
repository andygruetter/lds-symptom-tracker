-- Migration: Story 5.1 — sharing_links Tabelle
-- Erstellt: 2026-03-15
-- Zweck: Sharing-Links für Arzt-Zugang (Zwei-Stufen-Token, D3)

CREATE TABLE sharing_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  recipient_email TEXT NULL,        -- Vorbereitung Story 5.2
  revoked_at TIMESTAMPTZ NULL,      -- Vorbereitung Story 5.4
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS aktivieren
ALTER TABLE sharing_links ENABLE ROW LEVEL SECURITY;

-- Policies: Patient verwaltet nur eigene Links
CREATE POLICY "sharing_links_patient_select" ON sharing_links
  FOR SELECT TO authenticated
  USING (auth.uid() = account_id);

CREATE POLICY "sharing_links_patient_insert" ON sharing_links
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = account_id);

CREATE POLICY "sharing_links_patient_update" ON sharing_links
  FOR UPDATE TO authenticated
  USING (auth.uid() = account_id);

-- Kein DELETE: Links bleiben als Audit-Trail (NFR11)

-- Indexes
CREATE UNIQUE INDEX idx_sharing_links_token ON sharing_links(token);
CREATE INDEX idx_sharing_links_account_id ON sharing_links(account_id);
