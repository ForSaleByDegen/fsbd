-- Optional area tag for profiles: "I'm from Austin, TX" etc.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS area_tag TEXT;
