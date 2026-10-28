import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPowerBiRows, parsePowerBiResponse, buildDaxQuery } from '../src/powerbi.mjs';

const env = {
  POWERBI_TENANT_ID: '11111111-1111-4111-8111-111111111111',
  POWERBI_CLIENT_ID: '22222222-2222-4222-8222-222222222222',
  POWERBI_CLIENT_SECRET: 'example-only-do-not-use',
  POWERBI_WORKSPACE_ID: '33333333-3333-4333-8333-333333333333',
  POWERBI_DATASET_ID: '44444444-4444-4444-8444-444444444444',
  POWERBI_TABLE: 'KpiDaily'
};
const now = new Date('2026-10-26T10:00:00.000Z');

test('DAX query aggregates one row per day within UTC 180-day window', () => {
  const dax = buildDaxQuery('KpiDaily', now);
  assert.match(dax, /SUMMARIZECOLUMNS/);
  assert.match(dax, /DATE\(2026, 10, 26\)/);
  assert.match(dax, /COALESCE\(SUM\('KpiDaily'\[SFC\]\), 0\)/);
  assert.match(dax, /'KpiDaily'\[Date\]/);
  assert.throws(() => buildDaxQuery('Bad!Table', now), /Invalid Power BI table/);
});

test('Power BI adapter authenticates then reads executeQueries JSON', async () => {
  const calls = [];
  const simulatedFetch = async (url, options) => {
    calls.push({ url, options });
    if (calls.length === 1) return new Response(JSON.stringify({access_token: 'test-access-token'}), { status: 200, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ results: [{tables: [{ rows: [
      {'KpiDaily[Date]': '2026-10-26T00:00:00', '[AFC]': 29, '[SFC]': 22, '[Loads]': 44, '[Cases]': 191}
    ]}]}]}), {status: 200, headers: { 'Content-Type': 'application/json' }});
  };
  const rows = await loadPowerBiRows(env, simulatedFetch, now);
  assert.deepEqual(rows, [{date:'2026-10-26', afc:29, sfc:22, loads:44, cases:191}]);
  assert.match(calls[0].url, /login\.microsoftonline\.com\/11111111/);
  assert.match(calls[0].options.body, /client_credentials/);
  assert.match(calls[0].options.body, /analysis\.windows\.net%2Fpowerbi%2Fapi/);
  assert.match(calls[1].url, /groups\/33333333.*datasets\/44444444.*executeQueries$/);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer test-access-token');
  assert.equal(JSON.parse(calls[1].options.body).queries.length, 1);
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(calls[1].options.redirect, 'error');
});

test('parse adapter handles fully qualified or aliased fields and missing data', () => {
  const result = parsePowerBiResponse({results:[{tables:[{rows:[
    {'[Date]':'2026-10-26', '[AFC]': 1, '[SFC]': 2, '[Loads]': 3, '[Cases]': 4}
  ]}]}]});
  assert.equal(result[0].loads, 3);
  assert.throws(() => parsePowerBiResponse({results:[{error: { message:'secret' }}]}), /query error/);
  assert.throws(() => parsePowerBiResponse({results:[{tables:[{rows:[]},{rows:[]}]}]}), /invalid query result/);
  assert.throws(() => parsePowerBiResponse({results:[{tables:[{rows:[
    {'[Date]':'2026-10-26', '[AFC]': 1, '[SFC]': 2, '[Loads]': 3, '[Cases]': 4},
    {'[Date]':'2026-10-26', '[AFC]': 1, '[SFC]': 2, '[Loads]': 3, '[Cases]': 4}
  ]}]}]}), /duplicate date/);
});

test('adapter refuses missing credentials and does not attempt a network request', async () => {
  await assert.rejects(loadPowerBiRows({}, () => { throw new Error('unexpected'); }, now), /Missing Power BI configuration/);
});

test('adapter handles rejected HTTP authorization without leaking response', async () => {
  const request = async () => new Response('super secret debug text', {status: 401});
  await assert.rejects(loadPowerBiRows(env, request, now), (err) => err.message.includes('HTTP 401') && !err.message.includes('super secret'));
});
