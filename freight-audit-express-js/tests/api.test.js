'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

async function withServer(fn, options = {}) {
  const app = createApp({ now: () => new Date('2026-10-28T00:00:00.000Z'), ...options });
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('GET /api/freight/audit-controls/kpis returns exactly four sample KPIs', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/freight/audit-controls/kpis`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json();
    assert.equal(body.sampleData, true);
    assert.deepEqual(Object.keys(body.kpis), [
      'freightCostDelta', 'costPerCase', 'ytdVariance', 'auditExceptions'
    ]);
    assert.equal(body.kpis.costPerCase.value, 1.86);
  });
});

test('health, unknown path and unsupported method are handled', async () => {
  await withServer(async (base) => {
    const health = await fetch(`${base}/api/health`);
    assert.deepEqual(await health.json(), { ok: true, source: 'mock' });
    const notFound = await fetch(`${base}/unknown`);
    assert.equal(notFound.status, 404);
    const post = await fetch(`${base}/api/freight/audit-controls/kpis`, { method: 'POST' });
    assert.equal(post.status, 405);
  });
});

test('CORS enables only the configured UI origin', async () => {
  await withServer(async (base) => {
    const allowed = await fetch(`${base}/api/freight/audit-controls/kpis`, {
      headers: { Origin: 'http://localhost:5173' }
    });
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    const blocked = await fetch(`${base}/api/freight/audit-controls/kpis`, {
      headers: { Origin: 'http://other.example' }
    });
    assert.equal(blocked.headers.get('access-control-allow-origin'), null);
  }, { allowedOrigin: 'http://localhost:5173' });
});
