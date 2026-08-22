-- Phase 4: Financial architecture fixes
-- Idempotency, receipts, and refunds

-- 1. Add idempotency_key to funding_transactions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_transactions' AND column_name = 'idempotency_key') THEN
    ALTER TABLE funding_transactions ADD COLUMN idempotency_key TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_funding_transactions_idempotency ON funding_transactions(funding_case_id, user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
  END IF;
END;
$$;

-- 2. Add refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funding_transaction_id UUID NOT NULL REFERENCES funding_transactions(id) ON DELETE CASCADE,
  funding_case_id UUID NOT NULL REFERENCES funding_cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_transaction ON refunds(funding_transaction_id);
CREATE INDEX IF NOT EXISTS idx_refunds_case ON refunds(funding_case_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user ON refunds(user_id);

-- 3. Add receipt_number to funding_transactions for unified receipt tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_transactions' AND column_name = 'receipt_number') THEN
    ALTER TABLE funding_transactions ADD COLUMN receipt_number TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_funding_transactions_receipt ON funding_transactions(receipt_number) WHERE receipt_number IS NOT NULL;
  END IF;
END;
$$;
