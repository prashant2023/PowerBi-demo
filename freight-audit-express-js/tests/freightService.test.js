'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getFreightAuditKpis } = require('../src/services/freightService');

test('returns four mock freight KPIs and preserves response format', () => {
  const kpis = getFreightAuditKpis(new Date('2026-10-28T00:00:00.000Z'));
  assert.equal(kpis.sampleData, true);
  assert.equal(kpis.source, 'mock');
  assert.equal(kpis.period, 'P06');
  assert.equal(kpis.generatedAt, '2026-10-28T00:00:00.000Z');
  assert.deepEqual(Object.keys(kpis.kpis), [
    'freightCostDelta', 'costPerCase', 'ytdVariance', 'auditExceptions'
  ]);
  assert.deepEqual(Object.fromEntries(Object.entries(kpis.kpis).map(([key, v]) => [key, v.value])), {
    freightCostDelta: -0.06,
    costPerCase: 1.86,
    ytdVariance: 2100000,
    auditExceptions: 2685
  });
});

test('generates a fresh payload for each API call', () => {
  const first = getFreightAuditKpis();
  first.kpis.auditExceptions.value = 0;
  assert.equal(getFreightAuditKpis().kpis.auditExceptions.value, 2685);
});
