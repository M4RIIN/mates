-- Statistiques globales de clics.
--
-- Colonnes renvoyées:
-- - total_unique_users_uber_clicked: nombre total de personnes distinctes ayant clique sur Uber
-- - total_unique_users_reserved_clicked: nombre total de personnes distinctes ayant clique sur Reserver
-- - total_uber_clicks: nombre total d'evenements Uber
-- - total_reservation_clicks: nombre total d'evenements Reserver

select
  count(distinct actor_user_id) filter (where event_type = 'uber_requested') as total_unique_users_uber_clicked,
  count(distinct actor_user_id) filter (where event_type = 'reservation_requested') as total_unique_users_reserved_clicked,
  count(*) filter (where event_type = 'uber_requested') as total_uber_clicks,
  count(*) filter (where event_type = 'reservation_requested') as total_reservation_clicks
from invitation_audit_events;
