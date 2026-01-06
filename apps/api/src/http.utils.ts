export function parseIsoDateOrThrow(value: unknown, fieldName: string): Date {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing ${fieldName}`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return parsed;
}

export function parseOptionalIsoDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function pickRollup(value: unknown): 'raw' | '5m' | '1h' {
  if (value === '5m' || value === '1h' || value === 'raw') return value;
  return 'raw';
}

