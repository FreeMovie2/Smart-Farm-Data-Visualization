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

function clamp(min: number, value: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function nowIsoUtc() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPayload(
  deviceId: string,
  farmId: string,
  zoneId: string,
  scenarioProfile: string,
  cycle: number,
): IngestPayload {
  const dayPhase = Math.sin((cycle / 18) * Math.PI * 2); // smooth cycle for demo
  const daylight = clamp(0, (dayPhase + 1) / 2, 1);

  let airTemp = 24 + randomBetween(-1.5, 1.5) + daylight * 4;
  let airRH = 72 + randomBetween(-6, 6) - daylight * 6;
  let soil1 = 32 + randomBetween(-5, 5);
  let soil2 = 32 + randomBetween(-5, 5);
  let soil3 = 32 + randomBetween(-5, 5);
  let par = clamp(0, daylight * 900 + randomBetween(-40, 40), 900);
  let ec = 2.0 + randomBetween(-0.3, 0.3);
  let ph = 6.2 + randomBetween(-0.25, 0.25);

  if (scenarioProfile === 'demo-alerts') {
    // Make alerts predictable within a few minutes when worker thresholds are set for demo.
    if (zoneId.endsWith('2')) {
      airRH = 96 + randomBetween(-1.2, 1.2);
    }

    if (zoneId.endsWith('3')) {
      soil1 = 18 + randomBetween(-1.5, 1.5);
      soil2 = 18 + randomBetween(-1.5, 1.5);
      soil3 = 18 + randomBetween(-1.5, 1.5);
    }

    // Occasionally push EC/pH out of range briefly
    if (zoneId.endsWith('1') && cycle % 18 >= 10 && cycle % 18 <= 12) {
      ec = 3.4 + randomBetween(-0.1, 0.1);
      ph = 7.3 + randomBetween(-0.05, 0.05);
    }
  }

  airTemp = clamp(10, airTemp, 40);
  airRH = clamp(20, airRH, 100);
  soil1 = clamp(0, soil1, 100);
  soil2 = clamp(0, soil2, 100);
  soil3 = clamp(0, soil3, 100);
  ec = clamp(0.1, ec, 6);
  ph = clamp(3, ph, 10);

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
  const scenarioProfile = process.env.SCENARIO_PROFILE ?? 'realistic';

  const zones = (process.env.MOCK_ZONES ?? 'zone-1,zone-2,zone-3').split(',').map((s) => s.trim());
  const deviceIds = (process.env.MOCK_DEVICE_IDS ?? 'dev-01,dev-02,dev-03').split(',').map((s) => s.trim());
  const deviceKeys = (process.env.MOCK_DEVICE_KEYS ?? 'key1,key2,key3').split(',').map((s) => s.trim());

  if (zones.length !== deviceIds.length || deviceIds.length !== deviceKeys.length) {
    throw new Error('MOCK_ZONES/MOCK_DEVICE_IDS/MOCK_DEVICE_KEYS must have equal lengths');
  }

  await waitForApi(apiBaseUrl, healthPath);

  let cycle = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const isOfflineWindow = scenarioProfile === 'demo-alerts' && cycle % 18 >= 6; // 6 cycles on, 12 cycles off
      await Promise.all(
        zones.map((zoneId, index) => {
          // Optional: simulate a device going offline for a predictable window
          if (isOfflineWindow && zoneId.endsWith('3')) return Promise.resolve();
          return postIngest(
            apiBaseUrl,
            ingestPath,
            deviceKeys[index],
            buildPayload(deviceIds[index], farmId, zoneId, scenarioProfile, cycle),
          );
        }),
      );
    } catch (err) {
      console.error('[mock-generator] ingest error:', err);
    }

    cycle++;
    await sleep(intervalSeconds * 1000);
  }
}

void main();
