-- Disclaimer-Akzeptanz Tracking
-- Story 1.6: Disclaimer-Anzeige und Mehr-Seite

ALTER TABLE public.accounts
  ADD COLUMN disclaimer_accepted_at TIMESTAMPTZ DEFAULT NULL;

-- Bestehende UPDATE-Policy erlaubt bereits Änderungen an eigenen Rows
-- Kein zusätzlicher Index nötig: Primary Key (id) wird für WHERE-Clause genutzt
