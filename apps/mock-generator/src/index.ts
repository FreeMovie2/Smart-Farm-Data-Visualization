type IngestPayload = {
  deviceId: string;
  farmId: string;
  zoneId: string;
  ts: string;
  metrics: Record<string, number>;
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function nowIsoUtc() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPayload(deviceId: string, farmId: string, zoneId: string): IngestPayload {
  const airTemp = randomBetween(18, 32);
  const airRH = randomBetween(55, 92);
  const soil1 = randomBetween(20, 45);
  const soil2 = randomBetween(20, 45);
  const soil3 = randomBetween(20, 45);
  const par = randomBetween(0, 900);
  const ec = randomBetween(1.4, 2.6);
  const ph = randomBetween(5.7, 6.6);
  const leafWet = airRH > 85 ? 1 : 0;

  return {
    deviceId,
    farmId,
    zoneId,
    ts: nowIsoUtc(),
    metrics: { airTemp, airRH, soil1, soil2, soil3, par, ec, ph, leafWet },
  };
}

async function postIngest(apiBaseUrl: string, ingestPath: string, deviceKey: string, payload: IngestPayload) {
  const response = await fetch(`${apiBaseUrl}${ingestPath}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-device-key': deviceKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Ingest failed: ${response.status} ${response.statusText} ${text}`);
  }
}

async function waitForApi(apiBaseUrl: string, healthPath: string) {
  const maxAttempts = 60;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${apiBaseUrl}${healthPath}`);
      if (response.ok) return;
    } catch {
      // ignore until max attempts
    }

    await sleep(1000);
  }

  throw new Error(`API not ready after ${maxAttempts}s: ${apiBaseUrl}${healthPath}`);
}

async function main() {
  const enabled = (process.env.MOCK_ENABLED ?? 'true').toLowerCase() === 'true';
  if (!enabled) return;

  const apiBaseUrl = process.env.API_BASE_URL ?? 'http://api:4000';
  const ingestPath = process.env.INGEST_PATH ?? '/v1/ingest';
  const healthPath = process.env.API_HEALTH_PATH ?? '/health';
  const intervalSeconds = Number(process.env.MOCK_INTERVAL_SEC ?? 60);
  const farmId = process.env.MOCK_FARM_ID ?? 'farm-001';

  const zones = (process.env.MOCK_ZONES ?? 'zone-1,zone-2,zone-3').split(',').map((s) => s.trim());
  const deviceIds = (process.env.MOCK_DEVICE_IDS ?? 'dev-01,dev-02,dev-03').split(',').map((s) => s.trim());
  const deviceKeys = (process.env.MOCK_DEVICE_KEYS ?? 'key1,key2,key3').split(',').map((s) => s.trim());

  if (zones.length !== deviceIds.length || deviceIds.length !== deviceKeys.length) {
    throw new Error('MOCK_ZONES/MOCK_DEVICE_IDS/MOCK_DEVICE_KEYS must have equal lengths');
  }

  await waitForApi(apiBaseUrl, healthPath);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await Promise.all(
        zones.map((zoneId, index) =>
          postIngest(apiBaseUrl, ingestPath, deviceKeys[index], buildPayload(deviceIds[index], farmId, zoneId)),
        ),
      );
    } catch (err) {
      console.error('[mock-generator] ingest error:', err);
    }

    await sleep(intervalSeconds * 1000);
  }
}

void main();
