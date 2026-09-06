-- Medium-priority schema guardrails
-- Idempotent: safe to run multiple times

-- 1. Cap reputation_score to prevent unbounded inflation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'reputation_score'
  ) THEN
    ALTER TABLE users ADD COLUMN reputation_score INT NOT NULL DEFAULT 50;
  END IF;
END;
$$;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_reputation_score_check;

ALTER TABLE users
  ADD CONSTRAINT users_reputation_score_check
  CHECK (reputation_score BETWEEN 0 AND 100);
