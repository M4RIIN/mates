ALTER TYPE friendship_status ADD VALUE IF NOT EXISTS 'pending';

ALTER TABLE friendships
ALTER COLUMN status SET DEFAULT 'pending';
