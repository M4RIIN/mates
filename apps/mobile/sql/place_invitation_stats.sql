-- Requires migration 0011_establishment_statistics. Read-only manual queries.
-- Change both bounds in each params CTE. [start, end), Paris local time with DST.

-- Most proposed establishments, by invitation creation date. Cancellations explicit.
WITH params AS (
  SELECT '2026-10-01 00:00:00 Europe/Paris'::timestamptz AS start_at,
         '2026-11-01 00:00:00 Europe/Paris'::timestamptz AS end_at
)
SELECT e.id AS establishment_id, e.name, e.address,
  count(*) AS invitations_created,
  count(*) FILTER (WHERE i.canceled_at IS NULL) AS invitations_not_canceled,
  count(*) FILTER (WHERE i.canceled_at IS NOT NULL) AS invitations_canceled
FROM invitations i JOIN establishments e ON e.id = i.establishment_id CROSS JOIN params p
WHERE i.created_at >= p.start_at AND i.created_at < p.end_at
GROUP BY e.id ORDER BY invitations_created DESC, e.id;

-- Current confirmations, uniques and mean group size, by outing date.
-- Excludes canceled/future outings. Organizer not implicit. Never uses audit events.
-- Uniques exclude legacy web responses with an unknown browser identity.
WITH params AS (
  SELECT '2026-10-01 00:00:00 Europe/Paris'::timestamptz AS start_at,
         '2026-11-01 00:00:00 Europe/Paris'::timestamptz AS end_at
), eligible_outings AS (
  SELECT s.* FROM establishment_outing_summary s CROSS JOIN params p
  WHERE s.scheduled_at >= p.start_at AND s.scheduled_at < p.end_at
    AND s.scheduled_at <= CURRENT_TIMESTAMP AND s.canceled_at IS NULL
    AND s.establishment_id IS NOT NULL
), people AS (
  SELECT s.establishment_id, count(*) AS confirmed_participations,
    count(*) FILTER (WHERE p.participant_type = 'mates') AS mates_participations,
    count(*) FILTER (WHERE p.participant_type = 'web') AS web_participations,
    count(DISTINCT p.mates_user_id) AS unique_mates_accounts,
    count(DISTINCT p.browser_id_hash) AS estimated_unique_web_browsers,
    count(DISTINCT p.mates_user_id) + count(DISTINCT p.browser_id_hash) AS estimated_total_unique,
    count(*) FILTER (WHERE p.web_identity_unknown) AS web_participations_identity_unknown
  FROM eligible_outings s JOIN establishment_participations p ON p.invitation_id = s.invitation_id
  GROUP BY s.establishment_id
), groups AS (
  SELECT establishment_id, count(*) AS outings_not_canceled,
    count(*) FILTER (WHERE confirmed_count > 0) AS outings_with_confirmation,
    avg(confirmed_count) FILTER (WHERE confirmed_count > 0) AS average_confirmed_group_size
  FROM eligible_outings GROUP BY establishment_id
)
SELECT e.id AS establishment_id, e.name, e.address,
  coalesce(p.confirmed_participations, 0) AS confirmed_participations,
  coalesce(p.mates_participations, 0) AS mates_participations,
  coalesce(p.web_participations, 0) AS web_participations,
  coalesce(p.unique_mates_accounts, 0) AS unique_mates_accounts,
  coalesce(p.estimated_unique_web_browsers, 0) AS estimated_unique_web_browsers,
  coalesce(p.estimated_total_unique, 0) AS estimated_total_unique,
  coalesce(p.web_participations_identity_unknown, 0) AS web_participations_identity_unknown,
  g.outings_not_canceled, g.outings_with_confirmation,
  round(g.average_confirmed_group_size, 2) AS average_confirmed_group_size
FROM groups g JOIN establishments e ON e.id = g.establishment_id
LEFT JOIN people p ON p.establishment_id = e.id
ORDER BY confirmed_participations DESC, e.id;

-- Unassigned places, by creation date. NULL identities never merge on name alone.
WITH params AS (
  SELECT '2026-10-01 00:00:00 Europe/Paris'::timestamptz AS start_at,
         '2026-11-01 00:00:00 Europe/Paris'::timestamptz AS end_at
)
SELECT i.id, i.place_name, i.place_address, i.latitude, i.longitude, i.created_at, i.scheduled_at,
  CASE WHEN public.mates_establishment_key(i.place_name, i.place_address, i.latitude, i.longitude) IS NULL
    THEN 'insufficient_identity' ELSE 'requires_manual_review' END AS reason
FROM invitations i CROSS JOIN params p
WHERE i.establishment_id IS NULL AND i.created_at >= p.start_at AND i.created_at < p.end_at
ORDER BY i.created_at, i.id;

-- Participation coverage outside the reference, by outing date.
WITH params AS (
  SELECT '2026-10-01 00:00:00 Europe/Paris'::timestamptz AS start_at,
         '2026-11-01 00:00:00 Europe/Paris'::timestamptz AS end_at
)
SELECT count(*) AS unassigned_outings, coalesce(sum(s.confirmed_count), 0) AS unassigned_confirmations
FROM establishment_outing_summary s CROSS JOIN params p
WHERE s.establishment_id IS NULL AND s.scheduled_at >= p.start_at AND s.scheduled_at < p.end_at
  AND s.scheduled_at <= CURRENT_TIMESTAMP AND s.canceled_at IS NULL;
