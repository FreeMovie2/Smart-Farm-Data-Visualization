INSERT INTO farms (farm_id, name)
VALUES ('farm-001', 'Demo Farm')
ON CONFLICT (farm_id) DO NOTHING;

INSERT INTO zones (zone_id, farm_id, name)
VALUES
  ('zone-1', 'farm-001', 'Zone 1'),
  ('zone-2', 'farm-001', 'Zone 2'),
  ('zone-3', 'farm-001', 'Zone 3')
ON CONFLICT (zone_id) DO NOTHING;

INSERT INTO devices (device_id, farm_id, zone_id, device_key, name)
VALUES
  ('dev-01', 'farm-001', 'zone-1', 'key1', 'Mock Device 01'),
  ('dev-02', 'farm-001', 'zone-2', 'key2', 'Mock Device 02'),
  ('dev-03', 'farm-001', 'zone-3', 'key3', 'Mock Device 03')
ON CONFLICT (device_id) DO NOTHING;

