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
  ('dev-01a', 'farm-001', 'zone-1', 'key1a', 'Zone 1 Device A'),
  ('dev-01b', 'farm-001', 'zone-1', 'key1b', 'Zone 1 Device B'),
  ('dev-02a', 'farm-001', 'zone-2', 'key2a', 'Zone 2 Device A'),
  ('dev-02b', 'farm-001', 'zone-2', 'key2b', 'Zone 2 Device B'),
  ('dev-03a', 'farm-001', 'zone-3', 'key3a', 'Zone 3 Device A'),
  ('dev-03b', 'farm-001', 'zone-3', 'key3b', 'Zone 3 Device B')
ON CONFLICT (device_id) DO NOTHING;

