-- Migration: 20260626105704_add_welfare_org_payment_and_admins.sql
-- Purpose: Add missing payment/UPI columns to welfare_orgs and create welfare_org_admins table.

-- ─────────────────────────────────────────────────────────────────────────────
-- welfare_orgs payment/UPI columns
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE welfare_orgs
  ADD COLUMN IF NOT EXISTS upi_id TEXT,
  ADD COLUMN IF NOT EXISTS upi_name TEXT,
  ADD COLUMN IF NOT EXISTS payment_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS upi_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS upi_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS upi_verified_by UUID REFERENCES users(id);

-- ─────────────────────────────────────────────────────────────────────────────
-- welfare_org_admins
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS welfare_org_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  welfare_group_id UUID NOT NULL REFERENCES welfare_orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(welfare_group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_welfare_org_admins_group ON welfare_org_admins(welfare_group_id);
CREATE INDEX IF NOT EXISTS idx_welfare_org_admins_user ON welfare_org_admins(user_id);
