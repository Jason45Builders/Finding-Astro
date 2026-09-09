-- Memorial wall: community dog deaths, natural and suspicious
CREATE TABLE IF NOT EXISTS memorial_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dog_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('natural_death', 'suspicious_death')),
  description TEXT NOT NULL,
  best_memory TEXT,
  location TEXT,
  location_geog GEOGRAPHY(POINT, 4326),
  date_of_death DATE NOT NULL,
  cause_of_death TEXT,
  evidence_urls TEXT[] DEFAULT '{}',
  reporter_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_anonymous BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes TEXT,
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memorial_posts_public ON memorial_posts(is_public, created_at) WHERE is_public = TRUE;
CREATE INDEX idx_memorial_posts_category ON memorial_posts(category) WHERE is_public = TRUE;
CREATE INDEX idx_memorial_posts_location ON memorial_posts USING GIST(location_geog) WHERE location_geog IS NOT NULL;
