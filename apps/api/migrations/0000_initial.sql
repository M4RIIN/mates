CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE friendship_status AS ENUM ('pending', 'active', 'blocked');
CREATE TYPE response_status AS ENUM ('pending', 'yes', 'no');
CREATE TYPE push_platform AS ENUM ('ios', 'android', 'web', 'unknown');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pseudo text NOT NULL,
  public_tag text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_public_tag_unique_idx ON users (public_tag);

CREATE TABLE push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform push_platform NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX push_tokens_user_token_unique_idx ON push_tokens (user_id, token);
CREATE INDEX push_tokens_user_idx ON push_tokens (user_id);

CREATE TABLE friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status friendship_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX friendships_requester_addressee_unique_idx ON friendships (requester_id, addressee_id);
CREATE INDEX friendships_requester_idx ON friendships (requester_id);
CREATE INDEX friendships_addressee_idx ON friendships (addressee_id);

CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place_name text NOT NULL,
  place_address text,
  latitude double precision,
  longitude double precision,
  scheduled_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX invitations_creator_idx ON invitations (creator_id);
CREATE INDEX invitations_scheduled_at_idx ON invitations (scheduled_at);

CREATE TABLE invitation_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response_status response_status NOT NULL DEFAULT 'pending',
  delay_minutes integer,
  responded_at timestamptz,
  CONSTRAINT invitation_recipients_delay_for_yes_only CHECK (
    (response_status = 'yes' AND (delay_minutes IS NULL OR delay_minutes >= 0))
    OR (response_status IN ('pending', 'no') AND delay_minutes IS NULL)
  )
);

CREATE UNIQUE INDEX invitation_recipients_invitation_user_unique_idx ON invitation_recipients (invitation_id, user_id);
CREATE INDEX invitation_recipients_user_idx ON invitation_recipients (user_id);
CREATE INDEX invitation_recipients_invitation_idx ON invitation_recipients (invitation_id);
