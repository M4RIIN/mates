-- MANUAL EXAMPLES ONLY. Replace example values before executing.
-- No application write/admin endpoint. Do not run this file as a migration.

-- Create or promote the same normalized name/address, retaining its stable UUID.
-- Publishing is explicit: review the address first (never publish a private home).
INSERT INTO establishments (name, address, latitude, longitude, country_code,
  listing_status, active, priority, featured_radius_km)
VALUES ('Café Exemple', '12 rue Exemple, 75018 Paris', 48.8867, 2.3431, 'FR',
  'featured', true, 10, 10)
ON CONFLICT (identity_key) DO UPDATE SET
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, country_code = EXCLUDED.country_code,
  listing_status = EXCLUDED.listing_status, active = EXCLUDED.active,
  priority = EXCLUDED.priority, featured_radius_km = EXCLUDED.featured_radius_km
RETURNING id, name, address, listing_status;

-- Replace example UUID with returned ID. Optional supplier alias, verified manually.
-- Photon externalId = OSM type + '-' + numeric ID. Never reassign on conflict.
INSERT INTO establishment_external_refs (establishment_id, provider, external_id)
VALUES ('00000000-0000-4000-8000-000000000001', 'photon', 'N-123456789')
ON CONFLICT (provider, external_id) DO NOTHING;

UPDATE establishments SET priority = 20, featured_radius_km = 5
WHERE id = '00000000-0000-4000-8000-000000000001';

-- Searchable by name/address, without proximity promotion or mandatory coordinates.
UPDATE establishments SET listing_status = 'listed'
WHERE id = '00000000-0000-4000-8000-000000000001';

-- Disable: disappears from both catalog surfaces, historical links preserved.
UPDATE establishments SET active = false
WHERE id = '00000000-0000-4000-8000-000000000001';

-- Re-enable while keeping the venue private to the statistical reference.
UPDATE establishments SET active = true, listing_status = 'unlisted'
WHERE id = '00000000-0000-4000-8000-000000000001';

-- Unlisted records may contain private addresses: exploitation access only.
SELECT id, name, address, listing_status, active, priority, featured_radius_km
FROM establishments ORDER BY listing_status, priority DESC, id;
