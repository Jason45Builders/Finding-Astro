-- Welfare Group Direct UPI Donation + Manual Verification V1
-- Adds payment settings to welfare_orgs and creates welfare_payments table

-- 1. Add payment columns to welfare_orgs
ALTER TABLE welfare_orgs
  ADD COLUMN IF NOT EXISTS upi_id TEXT,
  ADD COLUMN IF NOT EXISTS upi_name TEXT,
  ADD COLUMN IF NOT EXISTS payment_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS upi_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS upi_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS upi_verified_by UUID REFERENCES users(id);

-- 2. Create welfare_org_admins table
CREATE TABLE IF NOT EXISTS welfare_org_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  welfare_group_id UUID NOT NULL REFERENCES welfare_orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(welfare_group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_welfare_org_admins_group ON welfare_org_admins(welfare_group_id);
CREATE INDEX IF NOT EXISTS idx_welfare_org_admins_user ON welfare_org_admins(user_id);

-- 3. Create welfare_payments table
CREATE TABLE IF NOT EXISTS welfare_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  welfare_group_id UUID NOT NULL REFERENCES welfare_orgs(id) ON DELETE CASCADE,
  donor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  upi_id_snapshot TEXT NOT NULL,
  upi_name_snapshot TEXT NOT NULL,
  utr TEXT NOT NULL,
  payment_date DATE NOT NULL,
  purpose TEXT,
  note TEXT,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  receipt_number TEXT NOT NULL UNIQUE,
  donor_name TEXT,
  donor_email TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_welfare_payments_group ON welfare_payments(welfare_group_id);
CREATE INDEX IF NOT EXISTS idx_welfare_payments_donor ON welfare_payments(donor_id);
CREATE INDEX IF NOT EXISTS idx_welfare_payments_status ON welfare_payments(status);
CREATE INDEX IF NOT EXISTS idx_welfare_payments_utr ON welfare_payments(utr);
CREATE INDEX IF NOT EXISTS idx_welfare_payments_receipt ON welfare_payments(receipt_number);

-- Prevent duplicate UTR submissions for the same welfare group
CREATE UNIQUE INDEX IF NOT EXISTS idx_welfare_payments_unique_utr ON welfare_payments(welfare_group_id, utr);

-- 4. Create welfare_payment_events for detailed audit trail
CREATE TABLE IF NOT EXISTS welfare_payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  welfare_payment_id UUID NOT NULL REFERENCES welfare_payments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT,
  notes TEXT,
  old_status TEXT,
  new_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_welfare_payment_events_payment ON welfare_payment_events(welfare_payment_id);
CREATE INDEX IF NOT EXISTS idx_welfare_payment_events_created_at ON welfare_payment_events(created_at);

-- 5. Update trigger for welfare_payments updated_at
CREATE OR REPLACE FUNCTION update_welfare_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_welfare_payments_updated_at ON welfare_payments;
CREATE TRIGGER trg_welfare_payments_updated_at
  BEFORE UPDATE ON welfare_payments
  FOR EACH ROW EXECUTE FUNCTION update_welfare_payments_updated_at();
