-- Migration: 20260626105701_guest_system_user.sql
-- Purpose: Create a well-known system user for anonymous/guest emergency reports.
-- Option A — preserves cases.reporter_user_id NOT NULL constraint.
-- Guest UUID: 00000000-0000-0000-0000-000000000001 (well-known, never logged in)

-- 1. Extend user_role enum to include guest_system (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'guest_system'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'guest_system';
  END IF;
END $$;

-- 2. Seed the guest system user if not present
INSERT INTO users (id, email, password_hash, full_name, role, identity_tier, reputation_score, report_credibility_score, is_banned, active_case_limit, is_available, service_radius_km, activity_count, completed_case_count)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, NULL, '', 'Guest Reporter', 'guest_system', 0, 0, 100, FALSE, 0, FALSE, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;
