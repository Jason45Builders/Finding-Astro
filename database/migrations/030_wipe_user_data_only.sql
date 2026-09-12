-- WARNING: This permanently deletes all user-uploaded media and user-entered content.
-- It preserves user accounts and app configuration/reference data.
-- Backup your database before running this.

-- NOTE: Do NOT run the storage deletion below in SQL Editor.
-- Supabase blocks direct deletion from storage tables.
-- Clear the bucket manually first:
--   Supabase Dashboard → Storage → finding-astro-media → Delete all files
-- Or use the Supabase Storage API / SDK.

-- 1. Clear photo/evidence URLs before truncating dependent tables
UPDATE users SET profile_photo_url = NULL;
UPDATE animals SET primary_photo_url = NULL;
UPDATE cases SET evidence_urls = '{}';
UPDATE memorial_posts SET evidence_urls = '{}';

-- 2. Truncate purely user-generated / activity tables (no app config impact)
TRUNCATE TABLE
  animal_photos,
  case_events,
  case_responses,
  case_escalations,
  case_time_tracking,
  transport_requests,
  adoption_applications,
  adopter_blacklist,
  safety_reports,
  ngo_verifications,
  identity_verifications,
  beta_feedback,
  ambulance_requests,
  reimbursement_requests,
  funding_transactions,
  welfare_payments,
  welfare_payment_events,
  notifications,
  push_tokens,
  login_attempts,
  password_reset_tokens,
  refresh_tokens,
  audit_logs,
  media_uploads,
  payouts,
  refunds,
  hospital_verifications,
  report_verdicts,
  vaccinations,
  medical_history,
  animal_presence,
  animal_visibility_audit,
  qr_scan_logs,
  csr_ward_sponsorships,
  csr_transactions,
  volunteer_activity_logs,
  volunteer_wellbeing_checks,
  welfare_org_admins
  RESTART IDENTITY CASCADE;

-- 3. Reset user-generated records in shared tables while keeping the rows
TRUNCATE TABLE
  sightings,
  abc_events,
  abuse_flags,
  qr_codes,
  feeding_points,
  vendor_stalls,
  public_outcomes,
  memorial_posts,
  recovery_funding,
  welfare_orgs,
  animals,
  cases,
  funding_cases,
  safe_awareness_zones
  RESTART IDENTITY CASCADE;
