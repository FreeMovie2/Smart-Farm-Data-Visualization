CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS farms (
  farm_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zones (
  zone_id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  zone_id TEXT NOT NULL REFERENCES zones(zone_id) ON DELETE CASCADE,
  device_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sensor_readings (
  ts TIMESTAMPTZ NOT NULL,
  farm_id TEXT NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  zone_id TEXT NOT NULL REFERENCES zones(zone_id) ON DELETE CASCADE,
  device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (ts, device_id, metric_key)
);

SELECT create_hypertable('sensor_readings', 'ts', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS sensor_readings_zone_metric_ts_idx
  ON sensor_readings (zone_id, metric_key, ts DESC);

CREATE INDEX IF NOT EXISTS sensor_readings_device_ts_idx
  ON sensor_readings (device_id, ts DESC);

CREATE TABLE IF NOT EXISTS alerts (
  alert_id BIGSERIAL PRIMARY KEY,
  farm_id TEXT NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  zone_id TEXT NOT NULL REFERENCES zones(zone_id) ON DELETE CASCADE,
  device_id TEXT REFERENCES devices(device_id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','critical')),
  status TEXT NOT NULL CHECK (status IN ('active','acknowledged','resolved')),
  message TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS alerts_zone_status_started_idx
  ON alerts (zone_id, status, started_at DESC);

CREATE TABLE IF NOT EXISTS events (
  event_id BIGSERIAL PRIMARY KEY,
  farm_id TEXT NOT NULL REFERENCES farms(farm_id) ON DELETE CASCADE,
  zone_id TEXT NOT NULL REFERENCES zones(zone_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_zone_ts_idx
  ON events (zone_id, ts DESC);

-- Continuous aggregates (optional but recommended)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    EXECUTE $sql$
      CREATE MATERIALIZED VIEW IF NOT EXISTS sensor_readings_5m
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('5 minutes', ts) AS bucket,
        farm_id,
        zone_id,
        device_id,
        metric_key,
        avg(metric_value) AS avg_value,
        min(metric_value) AS min_value,
        max(metric_value) AS max_value
      FROM sensor_readings
      GROUP BY bucket, farm_id, zone_id, device_id, metric_key
      WITH NO DATA
    $sql$;

    EXECUTE $sql$
      CREATE MATERIALIZED VIEW IF NOT EXISTS sensor_readings_1h
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('1 hour', ts) AS bucket,
        farm_id,
        zone_id,
        device_id,
        metric_key,
        avg(metric_value) AS avg_value,
        min(metric_value) AS min_value,
        max(metric_value) AS max_value
      FROM sensor_readings
      GROUP BY bucket, farm_id, zone_id, device_id, metric_key
      WITH NO DATA
    $sql$;
  END IF;
END
$$;

