-- Pawprints & Memories: community storytelling
-- Additive migration; does not alter Memorial Wall data.
CREATE TABLE IF NOT EXISTS community_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 160),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 20 AND 12000),
  category TEXT NOT NULL CHECK (category IN ('rescue','adoption','everyday_kindness','happy_memory','community_impact','other')),
  animal_name TEXT,
  animal_species TEXT CHECK (animal_species IS NULL OR animal_species IN ('dog','cat','wildlife','other')),
  broad_location TEXT,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden','removed')),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_community_stories_feed ON community_stories(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_stories_author ON community_stories(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_stories_category ON community_stories(category, published_at DESC);

CREATE TABLE IF NOT EXISTS community_story_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES community_stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('heart','inspiring','pawprint','thank_you')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(story_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_story_reactions_story ON community_story_reactions(story_id);

CREATE TABLE IF NOT EXISTS community_story_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES community_stories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden','removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_community_story_comments_story ON community_story_comments(story_id, created_at ASC);

CREATE TABLE IF NOT EXISTS community_story_bookmarks (
  story_id UUID NOT NULL REFERENCES community_stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(story_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_story_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES community_stories(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('harassment','privacy','animal_welfare','spam','misinformation','other')),
  details TEXT CHECK (details IS NULL OR char_length(details) <= 1000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(story_id, reporter_id)
);
CREATE INDEX IF NOT EXISTS idx_community_story_reports_queue ON community_story_reports(status, created_at ASC);

ALTER TABLE community_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_story_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_story_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_story_reports ENABLE ROW LEVEL SECURITY;

-- Application API accesses these tables through the server-only service role.
-- No direct client policies are added intentionally.
