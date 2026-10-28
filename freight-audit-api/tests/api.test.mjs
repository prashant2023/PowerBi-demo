import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.mjs';

async function withServer(fn) {
  const app = createApp({ now: () => new Date('2026-10-28T00:00:00.000Z') });
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
}

test('returns exactly four named KPIs with sample flag', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/freight/audit-controls/kpis`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const json = await response.json();
    assert.equal(json.sampleData, true);
    assert.equal(json.source, 'mock');
    assert.deepEqual(Object.keys(json.kpis), [
      'freightCostDelta', 'costPerCase', 'ytdVariance', 'auditExceptions'
    ]);
    assert.equal(json.kpis.freightCostDelta.value, -0.06);
    assert.equal(json.kpis.costPerCase.value, 1.86);
    assert.equal(json.kpis.ytdVariance.value, 2100000);
    assert.equal(json.kpis.auditExceptions.value, 2685);
    assert.equal(json.generatedAt, '2026-10-28T00:00:00.000Z');
  });
});

test('health endpoint and 404 are JSON', async () => {
  await withServer(async (base) => {
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).ok, true);
    const missing = await fetch(`${base}/not-a-route`);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: 'Endpoint not found' });
  });
});
