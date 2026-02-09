-- Add search_keywords column to listings for AI-generated and manual keywords
ALTER TABLE listings ADD COLUMN IF NOT EXISTS search_keywords TEXT[] DEFAULT '{}';
