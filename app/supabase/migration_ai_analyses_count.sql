-- Add ai_analyses_count to profiles for tracking total Snap to Compare uses
-- Run in Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_analyses_count INTEGER NOT NULL DEFAULT 0;
