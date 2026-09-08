ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS ambulance_service_id UUID REFERENCES ambulance_services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_ambulance_service_id ON users(ambulance_service_id);
