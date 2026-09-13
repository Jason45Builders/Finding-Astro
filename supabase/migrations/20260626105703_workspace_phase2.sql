-- Migration: 20260626105703_workspace_phase2.sql
-- Purpose: Phase 2 NGO workspace — volunteers, foster, shelters UI, ABC campaigns, case discussions, follow-ups, impact reports.

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'volunteer_skill') THEN
    CREATE TYPE volunteer_skill AS ENUM ('rescue', 'transport', 'foster', 'medical', 'abc', 'adoption', 'photography', 'legal', 'other');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'foster_assignment_status') THEN
    CREATE TYPE foster_assignment_status AS ENUM ('pending', 'active', 'completed', 'returned');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'followup_type') THEN
    CREATE TYPE followup_type AS ENUM ('adoption_7day', 'adoption_30day', 'adoption_90day', 'medical', 'general');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status') THEN
    CREATE TYPE campaign_status AS ENUM ('planned', 'active', 'completed', 'cancelled');
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Volunteer profiles (extended info beyond organization_members)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS volunteer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  welfare_group_id UUID NOT NULL REFERENCES welfare_orgs(id) ON DELETE CASCADE,
  skills volunteer_skill[] DEFAULT '{}',
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  availability_notes TEXT,
  has_vehicle BOOLEAN NOT NULL DEFAULT FALSE,
  vehicle_type TEXT,
  vehicle_capacity INT,
  can_foster BOOLEAN NOT NULL DEFAULT FALSE,
  foster_capacity INT DEFAULT 0,
  foster_species_accepted TEXT[] DEFAULT '{}',
  can_rescue BOOLEAN NOT NULL DEFAULT FALSE,
  can_transport BOOLEAN NOT NULL DEFAULT FALSE,
  has_medical_knowledge BOOLEAN NOT NULL DEFAULT FALSE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, welfare_group_id)
);

CREATE INDEX IF NOT EXISTS idx_volunteer_profiles_user ON volunteer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_profiles_group ON volunteer_profiles(welfare_group_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_profiles_available ON volunteer_profiles(is_available) WHERE is_available = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Foster homes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS foster_homes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  welfare_group_id UUID NOT NULL REFERENCES welfare_orgs(id) ON DELETE CASCADE,
  foster_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  address TEXT,
  location GEOGRAPHY(POINT, 4326),
  capacity INT NOT NULL DEFAULT 1,
  current_animals_count INT NOT NULL DEFAULT 0,
  species_accepted TEXT[] DEFAULT '{}',
  accepts_special_needs BOOLEAN NOT NULL DEFAULT FALSE,
  has_other_animals BOOLEAN NOT NULL DEFAULT FALSE,
  has_children BOOLEAN NOT NULL DEFAULT FALSE,
  experience_years INT DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_foster_homes_group ON foster_homes(welfare_group_id);
CREATE INDEX IF NOT EXISTS idx_foster_homes_user ON foster_homes(foster_user_id);
CREATE INDEX IF NOT EXISTS idx_foster_homes_active ON foster_homes(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_foster_homes_location ON foster_homes USING GIST(location) WHERE location IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Foster assignments
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS foster_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  welfare_group_id UUID NOT NULL REFERENCES welfare_orgs(id) ON DELETE CASCADE,
  foster_home_id UUID NOT NULL REFERENCES foster_homes(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  actual_end_date TIMESTAMPTZ,
  status foster_assignment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_foster_assignments_group ON foster_assignments(welfare_group_id);
CREATE INDEX IF NOT EXISTS idx_foster_assignments_foster ON foster_assignments(foster_home_id);
CREATE INDEX IF NOT EXISTS idx_foster_assignments_animal ON foster_assignments(animal_id);
CREATE INDEX IF NOT EXISTS idx_foster_assignments_case ON foster_assignments(case_id);
CREATE INDEX IF NOT EXISTS idx_foster_assignments_status ON foster_assignments(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Case discussion threads
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS case_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  welfare_group_id UUID NOT NULL REFERENCES welfare_orgs(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_name TEXT NOT NULL,
  actor_role TEXT,
  message TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_comments_case ON case_comments(case_id);
CREATE INDEX IF NOT EXISTS idx_case_comments_group ON case_comments(welfare_group_id);
CREATE INDEX IF NOT EXISTS idx_case_comments_actor ON case_comments(actor_user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Post-adoption follow-ups
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS post_adoption_followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  welfare_group_id UUID NOT NULL REFERENCES welfare_orgs(id) ON DELETE CASCADE,
  adoption_application_id UUID NOT NULL REFERENCES adoption_applications(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  adopter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followup_type followup_type NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  completed_date TIMESTAMPTZ,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_adoption_followups_group ON post_adoption_followups(welfare_group_id);
CREATE INDEX IF NOT EXISTS idx_post_adoption_followups_application ON post_adoption_followups(adoption_application_id);
CREATE INDEX IF NOT EXISTS idx_post_adoption_followups_animal ON post_adoption_followups(animal_id);
CREATE INDEX IF NOT EXISTS idx_post_adoption_followups_adopter ON post_adoption_followups(adopter_user_id);
CREATE INDEX IF NOT EXISTS idx_post_adoption_followups_scheduled ON post_adoption_followups(scheduled_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- ABC campaigns
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS abc_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  welfare_group_id UUID NOT NULL REFERENCES welfare_orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location_text TEXT,
  location GEOGRAPHY(POINT, 4326),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  target_animals INT,
  captured_count INT NOT NULL DEFAULT 0,
  sterilized_count INT NOT NULL DEFAULT 0,
  vaccinated_count INT NOT NULL DEFAULT 0,
  returned_count INT NOT NULL DEFAULT 0,
  complications_count INT NOT NULL DEFAULT 0,
  mortality_count INT NOT NULL DEFAULT 0,
  total_cost_inr NUMERIC DEFAULT 0,
  clinic_name TEXT,
  vet_name TEXT,
  status campaign_status NOT NULL DEFAULT 'planned',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abc_campaigns_group ON abc_campaigns(welfare_group_id);
CREATE INDEX IF NOT EXISTS idx_abc_campaigns_status ON abc_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_abc_campaigns_dates ON abc_campaigns(start_date, end_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- Impact reports (generated snapshots)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS impact_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  welfare_group_id UUID NOT NULL REFERENCES welfare_orgs(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  file_url TEXT,
  generated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_impact_reports_group ON impact_reports(welfare_group_id);
CREATE INDEX IF NOT EXISTS idx_impact_reports_period ON impact_reports(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_impact_reports_type ON impact_reports(report_type);