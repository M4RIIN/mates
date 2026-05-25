CREATE TYPE invitation_audit_event_type AS ENUM (
  'created',
  'accepted',
  'uber_requested',
  'reservation_requested'
);

CREATE TABLE invitation_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  parent_audit_event_id uuid REFERENCES invitation_audit_events(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type invitation_audit_event_type NOT NULL,
  place_name text NOT NULL,
  place_address text,
  scheduled_at timestamp with time zone NOT NULL,
  invited_count integer NOT NULL CHECK (invited_count >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX invitation_audit_events_invitation_idx ON invitation_audit_events (invitation_id);
CREATE INDEX invitation_audit_events_parent_audit_event_idx ON invitation_audit_events (parent_audit_event_id);
CREATE INDEX invitation_audit_events_actor_user_idx ON invitation_audit_events (actor_user_id);
CREATE UNIQUE INDEX invitation_audit_events_created_unique_idx
  ON invitation_audit_events (invitation_id, event_type)
  WHERE event_type = 'created';
