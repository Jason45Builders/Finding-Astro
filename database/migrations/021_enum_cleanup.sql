-- Fix case_status enum anomaly
-- Idempotent: safe to run multiple times
--
-- NOTE: PostgreSQL does not support dropping enum values with ALTER TYPE ...
-- DROP VALUE. We therefore only migrate any bad data off the stale label.
-- The leftover enum value is harmless because application code no longer
-- uses it.

-- 1. Migrate any cases using the anomalous status to a valid one
UPDATE cases
SET status = 'resolved'
WHERE status = 'VERIFIED_REIMBURSEMENT';
