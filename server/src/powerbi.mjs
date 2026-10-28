import { normalizeReportRow, isoDay, atUtcToday } from './data.mjs';

const guid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const METRICS = ['AFC', 'SFC', 'Loads', 'Cases'];

function requiredSettings(env) {
  const names = ['POWERBI_TENANT_ID', 'POWERBI_CLIENT_ID', 'POWERBI_CLIENT_SECRET', 'POWERBI_WORKSPACE_ID', 'POWERBI_DATASET_ID'];
  for (const name of names) if (!env[name]) throw new Error(`Missing Power BI configuration: ${name}`);
  for (const name of names.filter((key) => key !== 'POWERBI_CLIENT_SECRET')) {
    if (!guid.test(env[name])) throw new Error(`Invalid Power BI configuration: ${name} must be a GUID`);
  }
  const table = env.POWERBI_TABLE || 'KpiDaily';
  // This is a trusted server config value, but reject unexpected characters to keep DAX predictable.
  if (!/^[A-Za-z_][A-Za-z0-9_ ]{0,63}$/.test(table)) {
    throw new Error('Invalid Power BI configuration: POWERBI_TABLE must be a simple table name');
  }
  return table;
}

function daxDate(day) {
  const [year, month, date] = day.split('-').map(Number);
  return `DATE(${year}, ${month}, ${date})`;
}

export function buildDaxQuery(table, now = new Date()) {
  if (!/^[A-Za-z_][A-Za-z0-9_ ]{0,63}$/.test(table)) throw new Error('Invalid Power BI table name');
  const today = atUtcToday(now);
  const first = new Date(today.getTime() - 179 * 86_400_000);
  const source = `'${table}'`;
  const sumMetrics = METRICS.map((name) => `    "${name}", COALESCE(SUM(${source}[${name}]), 0)`).join(',\n');
  return `EVALUATE\nSUMMARIZECOLUMNS(\n    ${source}[Date],\n    FILTER(${source}, ${source}[Date] >= ${daxDate(isoDay(first))} && ${source}[Date] <= ${daxDate(isoDay(today))}),\n${sumMetrics}\n)\nORDER BY ${source}[Date]`;
}

export function parsePowerBiResponse(payload) {
  if (!payload || typeof payload !== 'object' || payload.error) throw new Error('Power BI returned a query error');
  const results = payload.results;
  if (!Array.isArray(results) || results.length !== 1 || results[0]?.error) {
    throw new Error('Power BI returned a query error');
  }
  const tables = results[0]?.tables;
  if (!Array.isArray(tables) || tables.length !== 1 || tables[0]?.error || !Array.isArray(tables[0]?.rows)) {
    throw new Error('Power BI returned an invalid query result');
  }
  const rows = tables[0].rows;
  if (rows.length > 1000) throw new Error('Power BI returned too many daily records');
  const dates = new Set();
  return rows.map((record, i) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error(`Invalid Power BI row ${i + 1}`);
    const columns = {};
    for (const [key, val] of Object.entries(record)) {
      // DAX aliases are [AFC]; grouped source columns may be KpiDaily[Date].
      const clean = key.replace(/^.*\[/, '').replace(/\]$/, '').trim().toLowerCase();
      columns[clean] = val;
    }
    // Power BI typically serializes a DAX Date as 2026-10-26T00:00:00.
    if (typeof columns.date === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(columns.date)) {
      columns.date = columns.date.slice(0, 10);
    }
    const normalized = normalizeReportRow(columns, i + 1);
    if (dates.has(normalized.date)) throw new Error(`Invalid Power BI result: duplicate date ${normalized.date}`);
    dates.add(normalized.date);
    return normalized;
  });
}

export async function loadPowerBiRows(env, fetchImpl = fetch, now = new Date()) {
  const table = requiredSettings(env);
  const timeout = Number(env.POWERBI_TIMEOUT_MS || 25000);
  const timeoutMs = Number.isInteger(timeout) && timeout >= 1000 && timeout <= 120000 ? timeout : 25000;
  const tokenUrl = `https://login.microsoftonline.com/${env.POWERBI_TENANT_ID}/oauth2/v2.0/token`;
  const tokenResponse = await fetchImpl(tokenUrl, {
    method: 'POST',
    redirect: 'error',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.POWERBI_CLIENT_ID,
      client_secret: env.POWERBI_CLIENT_SECRET,
      scope: 'https://analysis.windows.net/powerbi/api/.default',
      grant_type: 'client_credentials'
    }).toString(),
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!tokenResponse.ok) throw new Error(`Power BI authentication failed (HTTP ${tokenResponse.status}). Check Entra app credentials.`);
  const tokenPayload = await tokenResponse.json().catch(() => null);
  if (!tokenPayload?.access_token || typeof tokenPayload.access_token !== 'string') {
    throw new Error('Power BI authentication returned no access token');
  }
  const endpoint = `https://api.powerbi.com/v1.0/myorg/groups/${env.POWERBI_WORKSPACE_ID}/datasets/${env.POWERBI_DATASET_ID}/executeQueries`;
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    redirect: 'error',
    headers: { Authorization: `Bearer ${tokenPayload.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queries: [{ query: buildDaxQuery(table, now) }],
      serializerSettings: { includeNulls: true }
    }),
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`Power BI query failed (HTTP ${response.status}). Check model permissions, table schema and tenant settings.`);
  const body = await response.json().catch(() => null);
  return parsePowerBiResponse(body);
}
