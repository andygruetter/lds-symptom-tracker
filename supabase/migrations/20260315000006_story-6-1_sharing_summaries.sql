-- Migration: Story 6.1 — sharing_summaries Tabelle
-- Erstellt: 2026-03-15
-- Zweck: Cache für KI-generierte Arzt-Dashboard-Zusammenfassungen (FR27)

CREATE TABLE sharing_summaries (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sharing_link_id  UUID        NOT NULL REFERENCES sharing_links(id) ON DELETE CASCADE,
  summary_text     TEXT        NOT NULL,
  event_count      INTEGER     NOT NULL,
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invalidated_at   TIMESTAMPTZ NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sharing_summaries_sharing_link_id_unique UNIQUE (sharing_link_id)
);

-- RLS aktivieren (Arzt hat keine Auth-Session — alle Ops via Service-Role)
ALTER TABLE sharing_summaries ENABLE ROW LEVEL SECURITY;

-- Policy: Service-Role SELECT (Arzt hat keine Auth-Session, kein auth.uid() Check)
CREATE POLICY "sharing_summaries_service_select" ON sharing_summaries
  FOR SELECT
  TO service_role
  USING (true);

-- Policy: Service-Role INSERT
CREATE POLICY "sharing_summaries_service_insert" ON sharing_summaries
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Service-Role UPDATE (für Invalidierung + Upsert)
CREATE POLICY "sharing_summaries_service_update" ON sharing_summaries
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- KEINE DELETE-Policy nötig (Summaries werden überschrieben, nie manuell gelöscht)
-- ON DELETE CASCADE auf sharing_link_id FK erledigt Cleanup automatisch
-- Kein separater Index nötig: UNIQUE-Constraint auf sharing_link_id erstellt implizit einen B-Tree-Index
