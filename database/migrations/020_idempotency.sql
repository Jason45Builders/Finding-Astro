-- Add idempotency support for case creation
-- Idempotent: safe to run multiple times

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cases' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE cases ADD COLUMN idempotency_key TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cases_idempotency_key ON cases(idempotency_key) WHERE idempotency_key IS NOT NULL;
  END IF;
END;
$$;
