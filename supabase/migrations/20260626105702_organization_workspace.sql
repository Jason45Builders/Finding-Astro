-- Migration: 20260626105702_organization_workspace.sql
-- Purpose: Phase 1 NGO workspace tables — org members, tasks, events, expenses, shelters, documents.

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_role') THEN
    CREATE TYPE org_role AS ENUM ('org_admin', 'rescue_coordinator', 'medical_coordinator', 'adoption_coordinator', 'finance', 'volunteer', 'vet', 'foster');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
    CREATE TYPE event_status AS ENUM ('planned', 'active', 'completed', 'cancelled');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_category') THEN
    CREATE TYPE expense_category AS ENUM ('veterinary', 'medicine', 'food', 'transport', 'shelter', 'utilities', 'supplies', 'abc', 'adoption', 'other');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shelter_assignment_status') THEN
    CREATE TYPE shelter_assignment_status AS ENUM ('active', 'released');
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  welfare_group_id UUID NOT NULL REFERENCES welfare_orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_role org_role NOT NULL DEFAULT 'volunteer',
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(welfare_group_id, user_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  welfare_group_id UUID NOT NULL REFERENCES welfare_orgs(id) ON DELETE CASCADE,
  assignee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  welfare_group_id UUID NOT NULL REFERENCES welfare_orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT,
  date TIMESTAMPTZ NOT NULL,
  location_text TEXT,
  location GEOGRAPHY(POINT, 4326),
  capacity INT,
  registrations_count INT NOT NULL DEFAULT 0,
  status event_status NOT NULL DEFAULT 'planned',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  welfare_group_id UUID NOT NULL REFERENCES welfare_orgs(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  category expense_category NOT NULL DEFAULT 'other',
  vendor TEXT,
  description TEXT,
  receipt_url TEXT,
  paid_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reimbursable BOOLEAN NOT NULL DEFAULT FALSE,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  reimbursed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shelters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  welfare_group_id UUID NOT NULL REFERENCES welfare_orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location_text TEXT,
  location GEOGRAPHY(POINT, 4326),
  total_capacity INT NOT NULL DEFAULT 0,
  occupied_count INT NOT NULL DEFAULT 0,
  quarantine_count INT NOT NULL DEFAULT 0,
  medical_count INT NOT NULL DEFAULT 0,
  adoption_ready_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shelter_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shelter_id UUID NOT NULL REFERENCES shelters(id) ON DELETE CASCADE,
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  assigned_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_date TIMESTAMPTZ,
  notes TEXT,
  status shelter_assignment_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS animal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  welfare_group_id UUID REFERENCES welfare_orgs(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  url TEXT NOT NULL,
  notes TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  welfare_group_id UUID NOT NULL REFERENCES welfare_orgs(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  url TEXT NOT NULL,
  expiry_date TIMESTAMPTZ,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_organization_members_group ON organization_members(welfare_group_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(org_role);

CREATE INDEX IF NOT EXISTS idx_tasks_group ON tasks(welfare_group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_case ON tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_tasks_animal ON tasks(animal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_events_group ON events(welfare_group_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_location ON events USING GIST(location) WHERE location IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(welfare_group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_case ON expenses(case_id);
CREATE INDEX IF NOT EXISTS idx_expenses_animal ON expenses(animal_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_approved ON expenses(approved);

CREATE INDEX IF NOT EXISTS idx_shelters_group ON shelters(welfare_group_id);
CREATE INDEX IF NOT EXISTS idx_shelters_location ON shelters USING GIST(location) WHERE location IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shelter_assignments_shelter ON shelter_assignments(shelter_id);
CREATE INDEX IF NOT EXISTS idx_shelter_assignments_animal ON shelter_assignments(animal_id);
CREATE INDEX IF NOT EXISTS idx_shelter_assignments_case ON shelter_assignments(case_id);
CREATE INDEX IF NOT EXISTS idx_shelter_assignments_status ON shelter_assignments(status);

CREATE INDEX IF NOT EXISTS idx_animal_documents_animal ON animal_documents(animal_id);
CREATE INDEX IF NOT EXISTS idx_animal_documents_case ON animal_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_animal_documents_group ON animal_documents(welfare_group_id);

CREATE INDEX IF NOT EXISTS idx_organization_documents_group ON organization_documents(welfare_group_id);
CREATE INDEX IF NOT EXISTS idx_organization_documents_type ON organization_documents(document_type);

-- RLS will be enabled by the dynamic trigger at the end of schema.sql