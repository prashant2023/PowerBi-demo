import test from 'node:test';
import assert from 'node:assert/strict';
import { makeDashboard, mockRows, normalizeReportRow } from '../src/data.mjs';

const now = new Date('2026-10-26T09:00:00.000Z');

test('mock dataset has 200 ordered rows with non-negative values', () => {
  const rows = mockRows(now);
  assert.equal(rows.length, 200);
  assert.equal(rows.at(-1).date, '2026-10-26');
  assert.ok(rows.every(row => row.afc >= 0 && row.sfc >= 0 && row.loads >= 0 && row.cases >= 0));
});

test('dashboard aggregates by chosen period and creates chart buckets', () => {
  const rows = mockRows(now);
  const seven = makeDashboard(rows, '7d', 'mock', now);
  assert.equal(seven.range.start, '2026-10-20');
  assert.equal(seven.range.end, '2026-10-26');
  assert.equal(seven.trend.length, 7);
  assert.equal(seven.recent.length, 6);
  assert.equal(seven.metrics.loads.value, rows.slice(-7).reduce((sum,row) => sum + row.loads, 0));
  assert.ok(Number.isFinite(seven.metrics.loads.change));
  assert.equal(makeDashboard(rows, '30d', 'mock', now).trend.length, 6);
  assert.equal(makeDashboard(rows, '90d', 'mock', now).trend.length, 9);
});

test('normalizeReportRow permits case-insensitive column names', () => {
  const row = normalizeReportRow({ DATE: '2026-10-26', Afc: '1,200', SFC: '300', LOADS: '90', Cases: '270' }, 2);
  assert.deepEqual(row, { date: '2026-10-26', afc: 1200, sfc: 300, loads: 90, cases: 270 });
});

test('normalizeReportRow rejects bad dates and bad numbers', () => {
  assert.throws(() => normalizeReportRow({ Date: '2026-02-30', AFC: 12, SFC: 13, Loads: 14, Cases: 15 }, 2), /Invalid Date/);
  assert.throws(() => normalizeReportRow({ Date: '2026-10-26', AFC: '-12', SFC: 13, Loads: 14, Cases: 15 }, 2), /Invalid AFC/);
});

test('dashboard returns null change when previous-period data absent', () => {
  const rows = [{date: '2026-10-26', afc: 1, sfc: 2, loads: 3, cases: 4}];
  const dashboard = makeDashboard(rows, '7d', 'powerbi', now);
  assert.equal(dashboard.metrics.afc.change, null);
  assert.equal(dashboard.daysWithData, 1);
});
