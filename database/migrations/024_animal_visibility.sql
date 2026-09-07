-- Animal privacy-first visibility model
-- Private by default; public only for specific operational needs.
-- No global visitor/viewer tracking.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'animal_visibility') THEN
    CREATE TYPE animal_visibility AS ENUM ('private', 'public_emergency', 'public_abc', 'public_medical', 'public_adoption', 'public_general');
  END IF;
END $$;

ALTER TABLE animals
  ADD COLUMN IF NOT EXISTS visibility animal_visibility NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS visibility_reason TEXT,
  ADD COLUMN IF NOT EXISTS visibility_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS visibility_changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility_changed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS animal_visibility_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT,
  old_visibility animal_visibility NOT NULL,
  new_visibility animal_visibility NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_animal_visibility_audit_animal ON animal_visibility_audit(animal_id);
CREATE INDEX IF NOT EXISTS idx_animals_visibility ON animals(visibility);
