CREATE TABLE friend_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX friend_groups_owner_idx ON friend_groups (owner_id);

CREATE TABLE friend_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES friend_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX friend_group_members_group_user_unique_idx ON friend_group_members (group_id, user_id);
CREATE INDEX friend_group_members_group_idx ON friend_group_members (group_id);
CREATE INDEX friend_group_members_user_idx ON friend_group_members (user_id);

ALTER TABLE invitations ADD COLUMN friend_group_id uuid REFERENCES friend_groups(id) ON DELETE SET NULL;
CREATE INDEX invitations_friend_group_idx ON invitations (friend_group_id);
