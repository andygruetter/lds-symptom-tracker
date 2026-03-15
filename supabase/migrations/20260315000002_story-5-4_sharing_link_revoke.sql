-- Migration: Story 5.4 — Composite-Index für Ablauf + Widerruf Prüfung
-- Erstellt: 2026-03-15
-- Zweck: Performante Middleware-Validierung von expires_at + revoked_at pro Request
--
-- Hinweis: revoked_at Spalte und UPDATE-Policy wurden bereits in Story 5.1 angelegt.
-- Diese Migration ergänzt nur den Composite-Index für optimierte Queries.

CREATE INDEX IF NOT EXISTS idx_sharing_links_expires_revoked
  ON sharing_links(expires_at, revoked_at);
