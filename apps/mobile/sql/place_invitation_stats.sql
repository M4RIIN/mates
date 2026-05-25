-- Statistiques par endroit.
-- Regroupement par lieu logique:
-- - place_name
-- - place_address si disponible
-- - sinon latitude/longitude
--
-- Colonnes renvoyées:
-- - total_invitations: nombre d'invitations créées pour ce lieu
-- - total_acceptances: nombre total de réponses actuelles "yes"
-- - total_reservation_clicks: nombre total de clics "Reserver"

with place_invitations as (
  select
    i.id as invitation_id,
    i.place_name,
    i.place_address,
    i.latitude,
    i.longitude,
    coalesce(
      i.place_name || '|' || coalesce(i.place_address, ''),
      i.place_name
    ) as place_label,
    case
      when i.place_address is not null then
        lower(trim(i.place_name)) || '|' || lower(trim(i.place_address))
      when i.latitude is not null and i.longitude is not null then
        lower(trim(i.place_name)) || '|' || round(i.latitude::numeric, 5)::text || '|' || round(i.longitude::numeric, 5)::text
      else
        lower(trim(i.place_name))
    end as place_key
  from invitations i
),
acceptance_totals as (
  select
    ir.invitation_id,
    count(*) filter (where ir.response_status = 'yes') as acceptance_count
  from invitation_recipients ir
  group by ir.invitation_id
),
reservation_click_totals as (
  select
    iae.invitation_id,
    count(*) filter (where iae.event_type = 'reservation_requested') as reservation_click_count
  from invitation_audit_events iae
  group by iae.invitation_id
)
select
  pi.place_key,
  min(pi.place_name) as place_name,
  min(pi.place_address) as place_address,
  min(pi.latitude) as latitude,
  min(pi.longitude) as longitude,
  count(distinct pi.invitation_id) as total_invitations,
  coalesce(sum(at.acceptance_count), 0) as total_acceptances,
  coalesce(sum(rct.reservation_click_count), 0) as total_reservation_clicks
from place_invitations pi
left join acceptance_totals at on at.invitation_id = pi.invitation_id
left join reservation_click_totals rct on rct.invitation_id = pi.invitation_id
group by pi.place_key
order by total_invitations desc, total_acceptances desc, place_name asc;
