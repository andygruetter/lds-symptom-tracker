-- Accounts-Tabelle (1:1 mit auth.users)
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- RLS aktivieren
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Nutzer sieht nur eigenen Account (und nur wenn nicht soft-deleted)
CREATE POLICY "Users can view own account"
  ON public.accounts FOR SELECT
  USING (auth.uid() = id AND deleted_at IS NULL);

-- Policy: Nutzer kann eigenen Account updaten (für Soft-Delete)
CREATE POLICY "Users can update own account"
  ON public.accounts FOR UPDATE
  USING (auth.uid() = id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = id);

-- Policy: Account-Erstellung bei Auth-Signup
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
