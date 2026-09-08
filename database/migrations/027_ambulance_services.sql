CREATE TABLE IF NOT EXISTS ambulance_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL DEFAULT 'private',
  phone TEXT NOT NULL,
  alternate_phone TEXT,
  vehicle_type TEXT,
  capacity INTEGER,
  city TEXT,
  location GEOGRAPHY(POINT, 4326),
  location_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ambulance_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  animal_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES ambulance_services(id) ON DELETE SET NULL,
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  patient_condition TEXT,
  pickup_location GEOGRAPHY(POINT, 4326) NOT NULL,
  pickup_location_text TEXT,
  destination_location GEOGRAPHY(POINT, 4326),
  destination_location_text TEXT,
  notes TEXT,
  responded_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ambulance_services_city ON ambulance_services(city);
CREATE INDEX IF NOT EXISTS idx_ambulance_services_active ON ambulance_services(is_active);
CREATE INDEX IF NOT EXISTS idx_ambulance_requests_case ON ambulance_requests(case_id);
CREATE INDEX IF NOT EXISTS idx_ambulance_requests_user ON ambulance_requests(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_ambulance_requests_status ON ambulance_requests(status);
