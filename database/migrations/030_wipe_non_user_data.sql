-- WARNING: This will permanently delete ALL application data except user accounts.
-- Run this only after confirming with stakeholders and creating a database backup.
-- To execute: paste this into Supabase SQL Editor and run.

-- 1. Clear Supabase Storage bucket
DELETE FROM storage.objects WHERE bucket_id = 'finding-astro-media';

-- 2. Truncate all data tables in dependency-safe order
-- Group 1: Leaf tables
TRUNCATE TABLE
  animal_photos,
  animal_visibility_audit,
  animal_presence,
  vaccinations,
  medical_history,
  case_responses,
  case_escalations,
  case_events,
  case_time_tracking,
  report_verdicts,
  welfare_payment_events,
  hospital_verifications,
  payouts,
  qr_scan_logs,
  csr_ward_sponsorships,
  welfare_org_admins,
  volunteer_activity_logs,
  volunteer_wellbeing_checks,
  login_attempts,
  notifications,
  push_tokens,
  funding_transactions,
  reimbursement_requests,
  transport_requests,
  media_uploads,
  refunds,
  password_reset_tokens,
  refresh_tokens,
  beta_feedback,
  ambulance_requests,
  adoption_applications,
  csr_transactions,
  audit_logs
  RESTART IDENTITY CASCADE;

-- Group 2: Mid-tier tables
TRUNCATE TABLE
  sightings,
  abc_events,
  abuse_flags,
  welfare_payments,
  qr_codes,
  feeding_points,
  vendor_stalls,
  public_outcomes,
  adopter_blacklist,
  memorial_posts,
  recovery_funding,
  safety_reports,
  ngo_verifications,
  identity_verifications
  RESTART IDENTITY CASCADE;

-- Group 3: Root tables
TRUNCATE TABLE
  animals,
  cases,
  funding_cases,
  safe_awareness_zones,
  welfare_orgs,
  csr_sponsors,
  ambulance_services,
  partner_clinics,
  partner_stores,
  helplines,
  abc_centres,
  wildlife_centers,
  wildlife_species_categories,
  behaviour_guidance_cards,
  transport_slabs,
  legal_aid_providers,
  education_content,
  wards
  RESTART IDENTITY CASCADE;
