-- ══════════════════════════════════════════════════════════════════════════════
-- Finding Astro — Complete Database Schema
-- PostgreSQL 15+ with PostGIS 3.4+
-- ══════════════════════════════════════════════════════════════════════════════

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ENUMS & CUSTOM TYPES
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('citizen', 'ngo', 'govt', 'admin', 'hospital');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'animal_status') THEN
    CREATE TYPE animal_status AS ENUM ('community', 'lost', 'found', 'reunited', 'adopted');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'case_type') THEN
    CREATE TYPE case_type AS ENUM ('rescue', 'abuse', 'conflict', 'lost_pet', 'abc', 'wildlife');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'case_status') THEN
    CREATE TYPE case_status AS ENUM ('open', 'in_review', 'action_taken', 'resolved', 'closed', 'VERIFIED_REIMBURSEMENT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'abc_event_type') THEN
    CREATE TYPE abc_event_type AS ENUM ('request', 'capture', 'surgery', 'return');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM ('auth', 'animal', 'case', 'abc', 'conflict', 'funding', 'medical', 'transport', 'education', 'system', 'adoption');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'funding_type') THEN
    CREATE TYPE funding_type AS ENUM ('PRE_FUNDED', 'REIMBURSEMENT', 'TRANSPORT', 'RECOVERY', 'CSR_POOL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'funding_status') THEN
    CREATE TYPE funding_status AS ENUM ('OPEN', 'CLOSED', 'FAILED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reimbursement_status') THEN
    CREATE TYPE reimbursement_status AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_recipient_type') THEN
    CREATE TYPE payout_recipient_type AS ENUM ('HOSPITAL', 'CLINIC', 'TRANSPORT_PROVIDER', 'CSR_POOL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status') THEN
    CREATE TYPE payout_status AS ENUM ('PENDING', 'RELEASED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vaccination_status') THEN
    CREATE TYPE vaccination_status AS ENUM ('verified', 'unverified', 'expired');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'medical_entry_type') THEN
    CREATE TYPE medical_entry_type AS ENUM ('treatment', 'vaccination', 'surgery', 'observation');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transport_status') THEN
    CREATE TYPE transport_status AS ENUM ('open', 'assigned', 'completed', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'abuse_flag_status') THEN
    CREATE TYPE abuse_flag_status AS ENUM ('internal_review', 'watch', 'escalated', 'cleared');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'education_audience') THEN
    CREATE TYPE education_audience AS ENUM ('community', 'volunteer', 'hospital', 'citizen', 'schools');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'disappearance_risk_level') THEN
    CREATE TYPE disappearance_risk_level AS ENUM ('stable', 'watch', 'urgent');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'adoption_status') THEN
    CREATE TYPE adoption_status AS ENUM ('pending_review', 'approved', 'trial', 'adopted', 'rejected', 'returned');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'csr_commitment_type') THEN
    CREATE TYPE csr_commitment_type AS ENUM ('pooled', 'ward', 'module', 'matching');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_verdict') THEN
    CREATE TYPE report_verdict AS ENUM ('confirmed_genuine', 'false_report', 'malicious', 'duplicate', 'unverifiable');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'responder_status') THEN
    CREATE TYPE responder_status AS ENUM ('claimed', 'en_route', 'on_scene', 'picked_up', 'at_hospital', 'completed', 'abandoned');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'clinic_type') THEN
    CREATE TYPE clinic_type AS ENUM ('govt_hospital', 'hospital', 'clinic');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'living_situation') THEN
    CREATE TYPE living_situation AS ENUM ('house_with_yard', 'apartment', 'shared_accommodation', 'other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prior_experience') THEN
    CREATE TYPE prior_experience AS ENUM ('none', 'some', 'experienced');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'csr_transaction_type') THEN
    CREATE TYPE csr_transaction_type AS ENUM ('case_allocation', 'matching', 'transport', 'recovery', 'ward_pool');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recovery_provider_type') THEN
    CREATE TYPE recovery_provider_type AS ENUM ('foster', 'ngo_shelter', 'clinic');
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. USERS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'citizen',
  
  -- Identity tiers
  identity_tier INT NOT NULL DEFAULT 0,
  aadhaar_hash TEXT,
  aadhaar_verified_at TIMESTAMPTZ,
  
  -- OTP
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  otp_attempts INT NOT NULL DEFAULT 0,
  
  -- Reputation & credibility
  reputation_score INT NOT NULL DEFAULT 50,
  report_credibility_score INT NOT NULL DEFAULT 100,
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  ban_reason TEXT,
  
  -- Volunteer/responder fields
  active_case_limit INT NOT NULL DEFAULT 3,
  is_available BOOLEAN NOT NULL DEFAULT FALSE,
  vehicle_type TEXT,
  vehicle_capacity INT,
  service_radius_km NUMERIC NOT NULL DEFAULT 10,
  home_location GEOGRAPHY(POINT, 4326),
  last_active_location GEOGRAPHY(POINT, 4326),
  
  -- Activity tracking
  activity_count INT NOT NULL DEFAULT 0,
  completed_case_count INT NOT NULL DEFAULT 0,
  last_login_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  
  -- Push
  push_token TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_available ON users(is_available) WHERE is_available = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_home_location ON users USING GIST(home_location) WHERE home_location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_last_active_location ON users USING GIST(last_active_location) WHERE last_active_location IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ANIMALS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS animals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  species TEXT NOT NULL,
  breed TEXT,
  gender TEXT,
  color TEXT,
  approx_age_months INT,
  size TEXT,
  temperament TEXT,
  distinguishing_marks TEXT,
  description TEXT,
  status animal_status NOT NULL DEFAULT 'community',
  primary_photo_url TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  is_sterilized BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_text TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  territory_label TEXT,
  
  -- Visual signature for AI matching
  visual_signature JSONB,
  
  -- Activity tracking
  last_seen_at TIMESTAMPTZ,
  last_confirmed_alive_at TIMESTAMPTZ,
  seen_today_count INT NOT NULL DEFAULT 0,
  disappearance_risk_level disappearance_risk_level NOT NULL DEFAULT 'stable',
  vaccination_status vaccination_status,
  
  -- Caretaker & adoption
  caretaker_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  adoptable_since TIMESTAMPTZ,
  adoption_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_animals_status ON animals(status);
CREATE INDEX IF NOT EXISTS idx_animals_location ON animals USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_animals_species ON animals(species);
CREATE INDEX IF NOT EXISTS idx_animals_adoptable ON animals(adoptable_since) WHERE adoptable_since IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_animals_territory ON animals(territory_label);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ANIMAL PHOTOS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS animal_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_animal_photos_animal_id ON animal_photos(animal_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SIGHTINGS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sightings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matched_animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  location_text TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  photo_url TEXT,
  confidence_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sightings_location ON sightings USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_sightings_animal_id ON sightings(animal_id);
CREATE INDEX IF NOT EXISTS idx_sightings_created_at ON sightings(created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ANIMAL PRESENCE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS animal_presence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  seen_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT,
  observation_notes TEXT,
  territory_label TEXT,
  location GEOGRAPHY(POINT, 4326),
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_animal_presence_animal_id ON animal_presence(animal_id);
CREATE INDEX IF NOT EXISTS idx_animal_presence_seen_at ON animal_presence(seen_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. VACCINATIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vaccinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  case_id UUID,
  administered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  vaccine_name TEXT NOT NULL,
  administered_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  batch_number TEXT,
  notes TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  status vaccination_status NOT NULL DEFAULT 'unverified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vaccinations_animal_id ON vaccinations(animal_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. MEDICAL HISTORY
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS medical_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  case_id UUID,
  abc_event_id UUID,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entry_type medical_entry_type NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  provider_name TEXT,
  treatment_date TIMESTAMPTZ NOT NULL,
  cost_amount NUMERIC,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_history_animal_id ON medical_history(animal_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. CASES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  case_type case_type NOT NULL,
  status case_status NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location_text TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  resolution_notes TEXT,
  
  -- Assignment scoring
  assignment_score NUMERIC,
  assignment_reason TEXT,
  
  -- Wildlife-specific
  wildlife_species_category TEXT,
  wildlife_condition TEXT,
  public_guidance_shown BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Safety / ABC
  guest_phone TEXT,
  held_for_review BOOLEAN NOT NULL DEFAULT FALSE,
  ngo_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ngo_verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ngo_verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_type ON cases(case_type);
CREATE INDEX IF NOT EXISTS idx_cases_reporter ON cases(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_cases_assigned ON cases(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_cases_location ON cases USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. CASE RESPONSES (Responder claims)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS case_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  responder_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status responder_status NOT NULL DEFAULT 'claimed',
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deadline_at TIMESTAMPTZ NOT NULL,
  reached_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  at_hospital_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ,
  abandon_reason TEXT,
  hospital_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_responses_case_id ON case_responses(case_id);
CREATE INDEX IF NOT EXISTS idx_case_responses_responder ON case_responses(responder_user_id);
CREATE INDEX IF NOT EXISTS idx_case_responses_status ON case_responses(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. CASE ESCALATIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS case_escalations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  escalation_level INT NOT NULL,
  radius_km NUMERIC NOT NULL,
  triggered_by_label TEXT,
  user_count_notified INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_escalations_case_id ON case_escalations(case_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. CASE EVENTS (Audit trail)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS case_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  from_status case_status,
  to_status case_status,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_events_case_id ON case_events(case_id);
CREATE INDEX IF NOT EXISTS idx_case_events_created_at ON case_events(created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. REPORT VERDICTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS report_verdicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verdict report_verdict NOT NULL,
  verdict_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verdict_by_role user_role NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_verdicts_case_id ON report_verdicts(case_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. ABC EVENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS abc_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  event_type abc_event_type NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  location GEOGRAPHY(POINT, 4326),
  geo_validated BOOLEAN NOT NULL DEFAULT FALSE,
  unreturned_alert BOOLEAN NOT NULL DEFAULT FALSE,
  requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abc_events_animal_id ON abc_events(animal_id);
CREATE INDEX IF NOT EXISTS idx_abc_events_status ON abc_events(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. PUSH TOKENS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type TEXT,
  device_location GEOGRAPHY(POINT, 4326),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. FUNDING CASES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS funding_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  type funding_type NOT NULL,
  total_amount NUMERIC NOT NULL,
  amount_raised NUMERIC NOT NULL DEFAULT 0,
  status funding_status NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funding_cases_case_id ON funding_cases(case_id);
CREATE INDEX IF NOT EXISTS idx_funding_cases_status ON funding_cases(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 18. FUNDING TRANSACTIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS funding_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funding_case_id UUID NOT NULL REFERENCES funding_cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'PENDING',
  is_matched BOOLEAN NOT NULL DEFAULT FALSE,
  matched_by_sponsor_id UUID,
  matched_amount NUMERIC,
  donor_name TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funding_transactions_funding_case_id ON funding_transactions(funding_case_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 19. REIMBURSEMENT REQUESTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reimbursement_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_claimed NUMERIC NOT NULL,
  bill_url TEXT NOT NULL,
  prescription_url TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  hospital_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status reimbursement_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_case_id ON reimbursement_requests(case_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_requests_volunteer ON reimbursement_requests(volunteer_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 20. HOSPITAL VERIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hospital_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reimbursement_id UUID NOT NULL REFERENCES reimbursement_requests(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verified BOOLEAN NOT NULL,
  notes TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospital_verifications_reimbursement ON hospital_verifications(reimbursement_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 21. PAYOUTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funding_case_id UUID NOT NULL REFERENCES funding_cases(id) ON DELETE CASCADE,
  recipient_type payout_recipient_type NOT NULL,
  recipient_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  status payout_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_funding_case_id ON payouts(funding_case_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 22. ABUSE FLAGS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS abuse_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  flagged_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  severity_score INT NOT NULL,
  pattern_key TEXT,
  reason TEXT NOT NULL,
  status abuse_flag_status NOT NULL DEFAULT 'internal_review',
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abuse_flags_case_id ON abuse_flags(case_id);
CREATE INDEX IF NOT EXISTS idx_abuse_flags_animal_id ON abuse_flags(animal_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 23. TRANSPORT REQUESTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transport_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  vehicle_type_required TEXT,
  patient_condition TEXT,
  pickup_location GEOGRAPHY(POINT, 4326) NOT NULL,
  destination_location GEOGRAPHY(POINT, 4326) NOT NULL,
  status transport_status NOT NULL DEFAULT 'open',
  slab_id UUID,
  slab_amount_inr NUMERIC,
  funding_source TEXT NOT NULL DEFAULT 'responder',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transport_requests_case_id ON transport_requests(case_id);
CREATE INDEX IF NOT EXISTS idx_transport_requests_status ON transport_requests(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 24. VOLUNTEER ACTIVITY LOGS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS volunteer_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  reference_id UUID,
  points_delta INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volunteer_activity_logs_user_id ON volunteer_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_activity_logs_created_at ON volunteer_activity_logs(created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 25. EDUCATION CONTENT
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS education_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_key TEXT NOT NULL,
  title TEXT NOT NULL,
  audience education_audience NOT NULL DEFAULT 'community',
  summary TEXT NOT NULL,
  action_points TEXT[] DEFAULT '{}',
  trigger_case_type case_type,
  trigger_animal_status animal_status,
  language_code TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_education_content_audience ON education_content(audience);
CREATE INDEX IF NOT EXISTS idx_education_content_topic_key ON education_content(topic_key);

-- ─────────────────────────────────────────────────────────────────────────────
-- 26. PARTNER CLINICS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS partner_clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  ward_name TEXT,
  city TEXT,
  phone TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  google_place_id TEXT,
  accepts_strays BOOLEAN NOT NULL DEFAULT FALSE,
  emergency_24hr BOOLEAN NOT NULL DEFAULT FALSE,
  has_surgery BOOLEAN NOT NULL DEFAULT FALSE,
  has_inpatient BOOLEAN NOT NULL DEFAULT FALSE,
  clinic_type clinic_type NOT NULL DEFAULT 'clinic',
  operating_hours TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_clinics_location ON partner_clinics USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_partner_clinics_active ON partner_clinics(is_active) WHERE is_active = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 27. PARTNER STORES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS partner_stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  ward_name TEXT,
  city TEXT,
  phone TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  google_place_id TEXT,
  sells_medicine BOOLEAN NOT NULL DEFAULT FALSE,
  sells_food BOOLEAN NOT NULL DEFAULT TRUE,
  operating_hours TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_stores_location ON partner_stores USING GIST(location);

-- ─────────────────────────────────────────────────────────────────────────────
-- 28. WELFARE ORGANISATIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS welfare_orgs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  org_type TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  location GEOGRAPHY(POINT, 4326),
  google_place_id TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_welfare_orgs_location ON welfare_orgs USING GIST(location) WHERE location IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 29. HELPLINES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS helplines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  description TEXT,
  category TEXT,
  city TEXT,
  is_24hr BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 30. ABC CENTRES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS abc_centres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  phone TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  location GEOGRAPHY(POINT, 4326),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abc_centres_location ON abc_centres USING GIST(location) WHERE location IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 31. WILDLIFE CENTRES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wildlife_centers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  location GEOGRAPHY(POINT, 4326),
  accepted_species TEXT[] DEFAULT '{}',
  operating_hours TEXT,
  is_24hr BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wildlife_centers_location ON wildlife_centers USING GIST(location) WHERE location IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 32. WILDLIFE SPECIES CATEGORIES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wildlife_species_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  handling_risk TEXT NOT NULL,
  public_guidance TEXT NOT NULL,
  do_not_do TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 33. BEHAVIOUR GUIDANCE CARDS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS behaviour_guidance_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  situation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  do_items TEXT[] DEFAULT '{}',
  dont_items TEXT[] DEFAULT '{}',
  audience TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_behaviour_guidance_situation ON behaviour_guidance_cards(situation_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- 34. SAFETY REPORTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS safety_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  situation_type TEXT NOT NULL,
  description TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  location_text TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  guidance_shown TEXT[] DEFAULT '{}',
  referred_to_case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_reports_location ON safety_reports USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_safety_reports_reporter ON safety_reports(reporter_user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 35. SAFE AWARENESS ZONES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS safe_awareness_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_name TEXT NOT NULL,
  ward_name TEXT,
  zone_type TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  radius_metres INT NOT NULL DEFAULT 500,
  animal_count INT NOT NULL DEFAULT 0,
  abc_coverage_pct INT NOT NULL DEFAULT 0,
  vaccination_pct INT NOT NULL DEFAULT 0,
  caretaker_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  qr_code_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safe_zones_location ON safe_awareness_zones USING GIST(location);

-- ─────────────────────────────────────────────────────────────────────────────
-- 36. QR CODES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  qr_type TEXT NOT NULL,
  linked_animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  linked_zone_id UUID REFERENCES safe_awareness_zones(id) ON DELETE SET NULL,
  linked_case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  location GEOGRAPHY(POINT, 4326),
  location_text TEXT,
  display_label TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  scan_count INT NOT NULL DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes(code);

-- ─────────────────────────────────────────────────────────────────────────────
-- 37. QR SCAN LOGS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS qr_scan_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  scanned_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  location GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_qr_code ON qr_scan_logs(qr_code_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 38. PUBLIC OUTCOMES (Trust signals)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  outcome_type TEXT NOT NULL,
  headline TEXT NOT NULL,
  detail TEXT,
  location_text TEXT,
  ward_name TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_outcomes_ward ON public_outcomes(ward_name);
CREATE INDEX IF NOT EXISTS idx_public_outcomes_public ON public_outcomes(is_public) WHERE is_public = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 39. CASE TIME TRACKING (for response metrics)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS case_time_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  mins_to_first_claim INT,
  mins_to_pickup INT,
  mins_to_clinic INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_time_tracking_case_id ON case_time_tracking(case_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 40. ADOPTION APPLICATIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS adoption_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  applicant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  living_situation living_situation NOT NULL,
  has_other_pets BOOLEAN NOT NULL DEFAULT FALSE,
  other_pets_desc TEXT,
  prior_experience prior_experience NOT NULL DEFAULT 'none',
  hours_alone_per_day NUMERIC NOT NULL DEFAULT 0,
  reason_for_adopting TEXT NOT NULL,
  status adoption_status NOT NULL DEFAULT 'pending_review',
  rejection_reason TEXT,
  review_notes TEXT,
  trial_start_date DATE,
  trial_end_date DATE,
  trial_check_notes TEXT,
  adoption_fee_inr NUMERIC NOT NULL DEFAULT 0,
  fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
  agreement_accepted_at TIMESTAMPTZ,
  agreement_text_hash TEXT,
  followup_done_at TIMESTAMPTZ,
  followup_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adoption_applications_animal_id ON adoption_applications(animal_id);
CREATE INDEX IF NOT EXISTS idx_adoption_applications_applicant ON adoption_applications(applicant_user_id);
CREATE INDEX IF NOT EXISTS idx_adoption_applications_status ON adoption_applications(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 41. ADOPTER BLACKLIST
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS adopter_blacklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  phone TEXT,
  reason TEXT NOT NULL,
  flagged_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  flagged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_adopter_blacklist_phone ON adopter_blacklist(phone);
CREATE INDEX IF NOT EXISTS idx_adopter_blacklist_user ON adopter_blacklist(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 42. CSR SPONSORS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS csr_sponsors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  registration_number TEXT,
  commitment_type csr_commitment_type NOT NULL DEFAULT 'pooled',
  committed_amount_inr NUMERIC NOT NULL DEFAULT 0,
  disbursed_amount_inr NUMERIC NOT NULL DEFAULT 0,
  matching_ratio NUMERIC,
  matching_cap_inr NUMERIC,
  active_from DATE NOT NULL,
  active_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 43. CSR WARD SPONSORSHIPS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS csr_ward_sponsorships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sponsor_id UUID NOT NULL REFERENCES csr_sponsors(id) ON DELETE CASCADE,
  ward_name TEXT NOT NULL,
  monthly_budget_inr NUMERIC NOT NULL,
  month TEXT NOT NULL,
  spent_inr NUMERIC NOT NULL DEFAULT 0,
  case_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csr_ward_sponsor ON csr_ward_sponsorships(sponsor_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 44. CSR TRANSACTIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS csr_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sponsor_id UUID NOT NULL REFERENCES csr_sponsors(id) ON DELETE CASCADE,
  funding_case_id UUID REFERENCES funding_cases(id) ON DELETE SET NULL,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  ward_name TEXT,
  amount_inr NUMERIC NOT NULL,
  transaction_type csr_transaction_type NOT NULL,
  reference_note TEXT,
  is_matching BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csr_transactions_sponsor ON csr_transactions(sponsor_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 45. RECOVERY FUNDING
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recovery_funding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  daily_cost_inr NUMERIC NOT NULL,
  provider_name TEXT,
  provider_type recovery_provider_type NOT NULL DEFAULT 'foster',
  start_date DATE NOT NULL,
  end_date DATE,
  total_raised NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_funding_case_id ON recovery_funding(case_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 46. TRANSPORT SLABS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transport_slabs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT NOT NULL,
  amount_inr NUMERIC NOT NULL,
  max_dist_km INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 47. MEDIA UPLOADS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS media_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cdn_url TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  size_bytes NUMERIC,
  purpose TEXT,
  linked_case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  linked_animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_uploads_case ON media_uploads(linked_case_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_animal ON media_uploads(linked_animal_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 48. FEEDING POINTS (Human welfare feature)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feeding_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caretaker_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  location_text TEXT,
  schedule_description TEXT,
  monthly_food_cost_inr NUMERIC,
  animal_count INT NOT NULL DEFAULT 0,
  abc_coverage BOOLEAN NOT NULL DEFAULT FALSE,
  vaccination_status vaccination_status,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feeding_points_location ON feeding_points USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_feeding_points_caretaker ON feeding_points(caretaker_user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 49. VOLUNTEER WELLBEING CHECKS (Human welfare feature)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS volunteer_wellbeing_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  triggered_after_cases INT NOT NULL DEFAULT 3,
  triggered_after_days INT NOT NULL DEFAULT 7,
  check_in_sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  mood_rating INT CHECK (mood_rating BETWEEN 1 AND 5),
  notes TEXT,
  needs_follow_up BOOLEAN NOT NULL DEFAULT FALSE,
  followed_up_at TIMESTAMPTZ,
  followed_up_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wellbeing_user ON volunteer_wellbeing_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_wellbeing_needs_follow_up ON volunteer_wellbeing_checks(needs_follow_up) WHERE needs_follow_up = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 50. LEGAL AID PROVIDERS (Human welfare feature)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS legal_aid_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  organisation TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  specializations TEXT[] DEFAULT '{}',
  is_pro_bono BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_aid_city ON legal_aid_providers(city);

-- ─────────────────────────────────────────────────────────────────────────────
-- 51. VENDOR STALLS (Human welfare feature)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_stalls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stall_name TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  location_text TEXT,
  ward_name TEXT,
  qr_code_id UUID,
  is_animal_friendly BOOLEAN NOT NULL DEFAULT FALSE,
  platform_rewards_points INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_stalls_location ON vendor_stalls USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_vendor_stalls_user ON vendor_stalls(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 52. AUDIT LOGS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role user_role,
  old_data JSONB,
  new_data JSONB,
  session_vars JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 53. VIEWS
-- ─────────────────────────────────────────────────────────────────────────────

-- Ward summary view
CREATE OR REPLACE VIEW ward_animal_summary AS
SELECT
  COALESCE(a.territory_label, 'Unknown') AS ward_name,
  COUNT(DISTINCT a.id) AS total_animals,
  COUNT(DISTINCT a.id) FILTER (WHERE a.is_sterilized) AS sterilised_count,
  COUNT(DISTINCT a.id) FILTER (WHERE a.vaccination_status = 'verified') AS vaccinated_count,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'lost') AS lost_count,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('open', 'in_review', 'action_taken')) AS open_cases,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('resolved', 'closed') AND c.updated_at > NOW() - INTERVAL '30 days') AS resolved_cases_30d,
  CASE
    WHEN COUNT(DISTINCT a.id) = 0 THEN 0
    ELSE ROUND(100.0 * COUNT(DISTINCT a.id) FILTER (WHERE a.is_sterilized) / COUNT(DISTINCT a.id))
  END AS abc_coverage_pct,
  MAX(GREATEST(a.updated_at, c.updated_at)) AS last_activity_at
FROM animals a
LEFT JOIN cases c ON c.animal_id = a.id
GROUP BY COALESCE(a.territory_label, 'Unknown');

-- ─────────────────────────────────────────────────────────────────────────────
-- 54. TRIGGERS (Updated_at)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
      AND table_name NOT IN (SELECT viewname FROM pg_views WHERE schemaname = 'public')
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      t, t
    );
  END LOOP;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 55. SEED DATA — Education & Guidance
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO education_content (topic_key, title, audience, summary, action_points, trigger_case_type, trigger_animal_status, language_code) VALUES
('cruelty_response', 'Cruelty and abuse response', 'community', 'Document visible harm, preserve evidence, and escalate to local police, the animal husbandry department, or a registered welfare NGO.', ARRAY['Record photos, videos, and eyewitness statements with timestamps.', 'Avoid confrontation if the situation is unsafe and prioritize immediate safety.', 'Reference local cruelty provisions and municipal animal welfare rules when escalating.'], 'abuse', NULL, 'en'),
('street_dog_mgmt', 'Street dog management', 'community', 'Community animals should be managed through vaccination, sterilization, feeding discipline, and conflict mitigation instead of forced relocation.', ARRAY['Coordinate ABC scheduling through approved municipal or NGO partners.', 'Maintain predictable feeding points away from traffic and school gates.', 'Track aggressive incidents separately to support targeted intervention.'], 'conflict', 'community', 'en'),
('lost_pet_recovery', 'Lost pet and ownership proof', 'community', 'Maintain recent photos, collar details, microchip tags where available, and neighbourhood sighting logs to support recovery.', ARRAY['Publish the last known location, distinguishing marks, and contact phone.', 'Cross-check nearby shelters, clinics, and resident groups within the first 24 hours.', 'Log every verified sighting with time and GPS coordinates.'], 'lost_pet', 'lost', 'en'),
('school_safety', 'Dog safety for children', 'schools', 'Teaching children how to safely interact with community dogs reduces fear and prevents bites.', ARRAY['Never approach an unknown dog from behind.', 'Stand still if a dog approaches — do not run.', 'Tell an adult if a dog looks sick or aggressive.'], 'conflict', 'community', 'en'),
('caretaker_rights', 'Your rights as a caretaker', 'volunteer', 'Animal caretakers have legal protection under the Prevention of Cruelty to Animals Act and ABC Rules.', ARRAY['Keep feeding at fixed times and locations.', 'Document any harassment with photos and witness statements.', 'Contact a welfare lawyer if you receive threats.'], 'conflict', 'community', 'en');

INSERT INTO behaviour_guidance_cards (situation_type, title, content, do_items, dont_items, audience, display_order) VALUES
('feel_unsafe', 'I feel unsafe near a dog', 'It is normal to feel cautious. Most dogs are harmless if you stay calm and move slowly.', ARRAY['Stay calm and avoid sudden movements.', 'Walk slowly away without turning your back.', 'Contact a local caretaker if the dog seems unwell.'], ARRAY['Do not run or scream.', 'Do not throw stones or shout at the dog.', 'Do not feed the dog without asking the caretaker.'], 'citizen', 1),
('aggression_concern', 'Dog showing aggression', 'Aggression is usually fear-based or territorial. Keep distance and alert a welfare volunteer.', ARRAY['Keep a safe distance and do not approach.', 'Note the exact location and time.', 'Report through the app so responders can assess.'], ARRAY['Do not try to restrain the dog yourself.', 'Do not provoke the dog to test its behaviour.', 'Do not ask strangers to handle it.'], 'citizen', 2),
('bite_incident', 'Someone has been bitten', 'Immediate first aid and medical attention are critical. Rabies is preventable if treated quickly.', ARRAY['Wash the wound with soap and running water for 15 minutes.', 'Seek medical attention immediately for PEP (rabies vaccine).', 'Report the incident so the dog can be observed.'], ARRAY['Do not apply home remedies or close the wound.', 'Do not ignore the bite even if it seems minor.', 'Do not harm the dog — it may be vaccinated and harmless.'], 'citizen', 3),
('pack_concern', 'Pack of dogs behaving strangely', 'Pack behaviour is usually territorial and temporary. Welfare teams can assess and manage the situation safely.', ARRAY['Stay calm and avoid the area if possible.', 'Report the location and time to the platform.', 'Note if any dogs appear injured or sick.'], ARRAY['Do not approach the pack.', 'Do not feed the pack to disperse them.', 'Do not call for removal without assessment.'], 'citizen', 4),
('child_safety', 'Child safety around dogs', 'Children are the most common bite victims. Education and supervision are the best protection.', ARRAY['Teach children to ask before petting any dog.', 'Supervise children near feeding areas.', 'Report any dog that shows repeated aggression toward children.'], ARRAY['Do not let children chase or tease dogs.', 'Do not assume a dog is safe because it looks friendly.', 'Do not leave children unattended near unfamiliar dogs.'], 'citizen', 5);

INSERT INTO wildlife_species_categories (name, display_name, handling_risk, public_guidance, do_not_do) VALUES
('snake', 'Snake', 'High — venom risk, muscling injury', 'Keep a safe distance. Do not attempt to catch or kill. Call a wildlife rescuer immediately. Note the colour and size if safe to do so.', 'Do not handle. Do not use sticks. Do not pour water or milk.'),
('bird', 'Bird', 'Low — fragile, stress-prone', 'If injured, gently place in a ventilated box in a quiet, dark place. Do not feed. Call a wildlife centre.', 'Do not feed bread or milk. Do not release until assessed. Do not keep as a pet.'),
('monkey', 'Monkey', 'Medium — bite risk, disease transmission', 'Do not make eye contact. Do not show teeth. Move away slowly. If injured, seek medical attention first, then report.', 'Do not feed. Do not approach infants. Do not attempt to trap.'),
('reptile', 'Reptile', 'Medium — salmonella, bite', 'Keep distance. Do not handle with bare hands. Call a wildlife specialist.', 'Do not handle without gloves. Do not release into water bodies. Do not keep as a pet.'),
('mammal', 'Mammal', 'Medium — bite, rabies risk', 'Observe from a distance. Do not touch. If the animal is injured, call a wildlife rescuer. If you are bitten, seek medical care immediately.', 'Do not handle. Do not feed. Do not attempt to keep or adopt.'),
('other', 'Other Wildlife', 'Unknown', 'Observe from a distance. Do not touch. Call a wildlife rescuer for guidance.', 'Do not handle. Do not feed. Do not attempt to keep.');

INSERT INTO transport_slabs (label, amount_inr, max_dist_km, is_active) VALUES
('Short (< 5 km)', 150, 5, TRUE),
('Medium (5–15 km)', 300, 15, TRUE),
('Long (15–30 km)', 500, 30, TRUE),
('Emergency (any distance)', 800, NULL, TRUE);

INSERT INTO helplines (name, phone, description, category, city, is_24hr, is_active) VALUES
('Blue Cross of India', '04446274999', 'Animal ambulance and rescue', 'rescue', 'Chennai', TRUE, TRUE),
('PETA India Emergency', '09990022060', 'Animal cruelty and emergency helpline', 'abuse', 'Chennai', TRUE, TRUE),
('Chennai Corporation Veterinary', '04425394999', 'Municipal ABC and vaccination', 'govt', 'Chennai', FALSE, TRUE),
('Childline India', '1098', 'Child safety and protection', 'child_safety', 'Chennai', TRUE, TRUE),
('iCall Psychosocial Helpline', '02225521111', 'Mental health support for volunteers', 'mental_health', 'India', TRUE, TRUE),
('Sangath', '01141198696', 'Counselling and mental health', 'mental_health', 'India', FALSE, TRUE);

-- ══════════════════════════════════════════════════════════════════════════════
-- END OF SCHEMA

-- Add deferred foreign key constraints (after all tables exist)
ALTER TABLE vaccinations ADD CONSTRAINT fk_vaccinations_case_id FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL;
ALTER TABLE medical_history ADD CONSTRAINT fk_medical_history_case_id FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL;
ALTER TABLE medical_history ADD CONSTRAINT fk_medical_history_abc_event_id FOREIGN KEY (abc_event_id) REFERENCES abc_events(id) ON DELETE SET NULL;
ALTER TABLE funding_transactions ADD CONSTRAINT fk_funding_transactions_sponsor_id FOREIGN KEY (matched_by_sponsor_id) REFERENCES csr_sponsors(id) ON DELETE SET NULL;
-- ══════════════════════════════════════════════════════════════════════════════
