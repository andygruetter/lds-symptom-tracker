-- Migration: Story 5.5 — audit_log Tabelle
-- Erstellt: 2026-03-15
-- Zweck: Append-only Audit-Log für Datenzugriffe (NFR11, FR38)

CREATE TABLE audit_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sharing_link_id  UUID        NOT NULL REFERENCES sharing_links(id) ON DELETE CASCADE,
  action           TEXT        NOT NULL,
  accessed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address_hash  TEXT        NULL,
  metadata         JSONB       NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS aktivieren
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Service-Role kann schreiben (Arzt hat keine Auth-Session)
-- KEINE auth.uid() Prüfung, da der Arzt-Zugriff ohne Supabase-Auth läuft.
-- Der Insert erfolgt ausschliesslich via createServiceClient() in API-Routen.
CREATE POLICY "audit_log_service_insert" ON audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Patient liest nur eigene Einträge
CREATE POLICY "audit_log_patient_select" ON audit_log
  FOR SELECT TO authenticated
  USING (auth.uid() = account_id);

-- KEINE UPDATE-Policy (append-only, NFR11)
-- KEINE DELETE-Policy (append-only, NFR11)

-- Indices
CREATE INDEX idx_audit_log_account_id      ON audit_log(account_id);
CREATE INDEX idx_audit_log_sharing_link_id ON audit_log(sharing_link_id);
CREATE INDEX idx_audit_log_accessed_at     ON audit_log(accessed_at DESC);
