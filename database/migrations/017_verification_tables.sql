-- Add missing verification tables and link NGO verification to welfare orgs
-- Idempotent: safe to run multiple times

-- 1. Create ngo_verifications table if not exists
CREATE TABLE IF NOT EXISTS ngo_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_name TEXT NOT NULL,
  org_type TEXT,
  registration_number TEXT,
  address TEXT,
  document_urls TEXT[] DEFAULT '{}',
  requested_tier INT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ngo_verifications_user ON ngo_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_ngo_verifications_status ON ngo_verifications(status);

-- 2. Create identity_verifications table if not exists
CREATE TABLE IF NOT EXISTS identity_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type TEXT,
  document_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_identity_verifications_user ON identity_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_verifications_status ON identity_verifications(status);

-- 3. Add welfare_org_id to ngo_verifications if table already exists without it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ngo_verifications')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ngo_verifications' AND column_name = 'welfare_org_id') THEN
    ALTER TABLE ngo_verifications ADD COLUMN welfare_org_id UUID REFERENCES welfare_orgs(id) ON DELETE SET NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ngo_verifications' AND column_name = 'welfare_org_id') THEN
    CREATE INDEX IF NOT EXISTS idx_ngo_verifications_welfare_org ON ngo_verifications(welfare_org_id);
  END IF;
END;
$$;

-- 4. Seed existing ngo_verifications rows with welfare_org_id if possible
-- This is a best-effort linkage for any orgs that may already exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ngo_verifications')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'welfare_orgs') THEN
    UPDATE ngo_verifications nv
    SET welfare_org_id = wo.id
    FROM welfare_orgs wo
    WHERE nv.welfare_org_id IS NULL
      AND wo.name = nv.org_name
      AND wo.is_active = TRUE
      AND nv.status = 'approved'
      AND nv.org_name IS NOT NULL;
  END IF;
END;
$$;
