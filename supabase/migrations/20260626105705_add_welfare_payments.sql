-- Migration: 20260626105705_add_welfare_payments.sql
-- Purpose: Create welfare_payments and welfare_payment_events tables for donation tracking.

-- ─────────────────────────────────────────────────────────────────────────────
-- welfare_payments
-- ─────────────────────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────────────────────
-- welfare_payment_events
-- ─────────────────────────────────────────────────────────────────────────────

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
