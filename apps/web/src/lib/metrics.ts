export type MetricKey =
  | 'airTemp'
  | 'airRH'
  | 'vpd'
  | 'soilAvg'
  | 'soil1'
  | 'soil2'
  | 'soil3'
  | 'par'
  | 'ec'
  | 'ph'
  | 'leafWet';

const METRIC_LABELS: Record<MetricKey, string> = {
  airTemp: 'Air Temp',
  airRH: 'RH',
  vpd: 'VPD',
  soilAvg: 'Soil Avg',
  soil1: 'Soil 1',
  soil2: 'Soil 2',
  soil3: 'Soil 3',
  par: 'PAR',
  ec: 'EC',
  ph: 'pH',
  leafWet: 'Leaf Wet',
};

const METRIC_UNITS: Partial<Record<MetricKey, string>> = {
  airTemp: '°C',
  airRH: '%',
  vpd: 'kPa',
  soilAvg: '%',
  soil1: '%',
  soil2: '%',
  soil3: '%',
  par: 'umol/m2/s',
  ec: 'mS/cm',
};

export function getMetricLabel(key: string) {
  return (METRIC_LABELS as Record<string, string>)[key] ?? key;
}

export function getMetricUnit(key: string) {
  return (METRIC_UNITS as Record<string, string>)[key];
}

export function formatMetricValue(key: string, value: number | null) {
  if (value === null || typeof value !== 'number' || Number.isNaN(value)) return 'N/A';
  if (key === 'leafWet') return value >= 1 ? 'Wet' : 'Dry';
  return value.toFixed(2);
}
