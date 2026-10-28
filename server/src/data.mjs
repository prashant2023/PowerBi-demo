// Normalized report input: Date (YYYY-MM-DD), AFC, SFC, Loads, Cases.
export const METRICS = ['afc', 'sfc', 'loads', 'cases'];
export const PERIODS = { '7d': 7, '30d': 30, '90d': 90 };

export function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

export function atUtcToday(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function mockRows(now = new Date()) {
  const today = atUtcToday(now);
  return Array.from({ length: 200 }, (_, index) => {
    const age = 199 - index;
    const day = new Date(today.getTime() - age * 86_400_000);
    const dayOfWeek = day.getUTCDay();
    const weekEffect = [0.7, 1, 1.08, 1.03, 1.12, 1.01, 0.77][dayOfWeek];
    const seasonal = Math.sin(age * 0.41) * 0.08 + Math.cos(age * 0.13) * 0.05;
    const growing = 1 + (199 - age) * 0.00072;
    const loads = Math.max(0, Math.round((455 + (index * 17) % 51) * weekEffect * (1 + seasonal) * growing));
    return {
      date: isoDay(day),
      afc: Math.round(loads * (0.58 + ((age % 5) * 0.008))),
      sfc: Math.round(loads * (0.39 + ((age % 3) * 0.007))),
      loads,
      cases: Math.round(loads * (5.3 + (age % 7) * 0.24))
    };
  });
}

export function parseNumeric(value, field, rowNumber) {
  const str = String(value ?? '').trim().replaceAll(',', '');
  if (!str || !/^\d+(\.\d+)?$/.test(str)) {
    throw new Error(`Invalid ${field} at data row ${rowNumber}; expected a non-negative number`);
  }
  const numeric = Number(str);
  if (!Number.isFinite(numeric)) throw new Error(`Invalid ${field} at data row ${rowNumber}`);
  return numeric;
}

export function normalizeReportRow(input, rowNumber) {
  const fields = Object.fromEntries(Object.entries(input).map(([key, value]) => [key.replace(/^\uFEFF/, '').trim().toLowerCase(), value]));
  const date = String(fields.date ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || isoDay(new Date(`${date}T00:00:00Z`)) !== date) {
    throw new Error(`Invalid Date at data row ${rowNumber}; expected YYYY-MM-DD`);
  }
  const row = { date };
  for (const field of METRICS) row[field] = parseNumeric(fields[field], field.toUpperCase(), rowNumber);
  return row;
}

const zero = () => ({ afc: 0, sfc: 0, loads: 0, cases: 0 });

function total(rows) {
  return rows.reduce((acc, row) => {
    for (const metric of METRICS) acc[metric] += row[metric];
    return acc;
  }, zero());
}

export function makeDashboard(rows, period = '30d', source = 'mock', now = new Date()) {
  const days = PERIODS[period];
  if (!days) throw new Error('Invalid period');
  const today = atUtcToday(now);
  const currentStart = isoDay(new Date(today.getTime() - (days - 1) * 86_400_000));
  const previousStart = isoDay(new Date(today.getTime() - (2 * days - 1) * 86_400_000));
  const todayStr = isoDay(today);
  const current = rows.filter((row) => row.date >= currentStart && row.date <= todayStr);
  const previous = rows.filter((row) => row.date >= previousStart && row.date < currentStart);
  const values = total(current);
  const previousValues = total(previous);
  const delta = {};
  for (const metric of METRICS) {
    delta[metric] = previous.length && previousValues[metric] > 0
      ? Math.round(((values[metric] - previousValues[metric]) / previousValues[metric]) * 1000) / 10
      : null;
  }

  const bucketSize = days === 7 ? 1 : days === 30 ? 5 : 10;
  const chart = [];
  for (let i = 0; i < days; i += bucketSize) {
    const start = isoDay(new Date(today.getTime() - (days - 1 - i) * 86_400_000));
    const end = isoDay(new Date(today.getTime() - (days - 1 - Math.min(days - 1, i + bucketSize - 1)) * 86_400_000));
    const bucket = current.filter((row) => row.date >= start && row.date <= end);
    const sums = total(bucket);
    chart.push({ date: end, label: new Date(`${start}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }), ...sums });
  }

  return {
    source,
    period,
    generatedAt: now.toISOString(),
    range: { start: currentStart, end: todayStr },
    metrics: Object.fromEntries(METRICS.map((metric) => [metric, { value: values[metric], change: delta[metric] }])),
    trend: chart,
    recent: [...current].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    daysWithData: new Set(current.map((row) => row.date)).size,
    expectedDays: days
  };
}
