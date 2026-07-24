-- Add profile_photo_url to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
