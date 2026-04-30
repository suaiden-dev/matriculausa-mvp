-- Table to receive document packages sent by Migma
CREATE TABLE IF NOT EXISTS migma_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_email TEXT NOT NULL,
  student_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  migma_application_id TEXT,
  zip_url TEXT NOT NULL,
  zip_expires_at TIMESTAMPTZ,
  student_name TEXT,
  process_type TEXT,
  files JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'received',
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE migma_packages ENABLE ROW LEVEL SECURITY;

-- Service role has full access (edge functions use service role)
CREATE POLICY "service_role_full_access" ON migma_packages
  USING (true)
  WITH CHECK (true);

-- Admins can read all packages
CREATE POLICY "admins_read_migma_packages" ON migma_packages
  FOR SELECT
  USING (
    public.is_admin()
  );

CREATE INDEX idx_migma_packages_student_user_id ON migma_packages(student_user_id);
CREATE INDEX idx_migma_packages_student_email ON migma_packages(student_email);
CREATE INDEX idx_migma_packages_received_at ON migma_packages(received_at DESC);
