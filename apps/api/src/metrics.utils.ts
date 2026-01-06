export function computeVpdKpa(airTempC: number, airRhPercent: number): number {
  const temp = airTempC;
  const rh = Math.max(0, Math.min(100, airRhPercent));
  const svp = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
  const vpd = (1 - rh / 100) * svp;
  return Math.max(0, vpd);
}

export function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

