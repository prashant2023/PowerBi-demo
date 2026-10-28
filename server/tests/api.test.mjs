import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.mjs';

async function withServer(app, cb) {
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise(resolve => server.once('listening', resolve));
    return await cb(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('mock health and KPI endpoints succeed without Power BI credentials', async () => {
  const app = createApp({ env: {DATA_SOURCE: 'mock'}, now: () => new Date('2026-10-26T10:00:00Z') });
  await withServer(app, async url => {
    const health = await (await fetch(`${url}/api/health`)).json();
    assert.deepEqual(health, { ok: true, source: 'mock', configured: true });
    const res = await fetch(`${url}/api/kpis?period=30d`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.period, '30d');
    assert.equal(body.trend.length, 6);
    assert.equal(body.source, 'mock');
  });
});

test('invalid period returns HTTP 400', async () => {
  await withServer(createApp(), async url => {
    const response = await fetch(`${url}/api/kpis?period=1000d`);
    assert.equal(response.status, 400);
  });
});

test('Power BI mode routes backend rows to the same KPI contract', async () => {
  let invoked = 0;
  const fakeRows = [{ date: '2026-10-26', afc: 12, sfc: 8, loads: 30, cases: 110 }];
  const app = createApp({
    env: {DATA_SOURCE: 'powerbi', POWERBI_TENANT_ID:'t', POWERBI_CLIENT_ID:'c', POWERBI_CLIENT_SECRET:'s', POWERBI_WORKSPACE_ID:'w', POWERBI_DATASET_ID:'d'},
    now: () => new Date('2026-10-26T10:00:00Z'),
    powerBiLoader: async () => { invoked++; return fakeRows; }
  });
  await withServer(app, async url => {
    const res = await fetch(`${url}/api/kpis?period=7d`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.source, 'powerbi');
    assert.equal(body.metrics.afc.value, 12);
    assert.equal(body.metrics.cases.value, 110);
    assert.equal(invoked, 1);
  });
});
