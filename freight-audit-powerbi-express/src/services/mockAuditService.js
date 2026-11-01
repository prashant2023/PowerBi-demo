'use strict';
const { createMockRecords } = require('../mock/records');
const { filteredRows, paginateRecords } = require('../utils/filters');
const records = createMockRecords();
const ROUND = n => Number(n.toFixed(2));

function makeKpis(rows, refreshDate) {
  const cases = rows.reduce((n,r) => n+r.cases,0);
  const freight = rows.reduce((n,r) => n+r.freightCost,0);
  const standard = rows.reduce((n,r) => n+r.standardCost,0);
  // Only MOCK business logic: weighted per-case averages.
  // In live mode use the client's existing AFC/SFC/Delta model measures, not these assumptions.
  return {
    afc: cases ? ROUND(freight/cases) : null,
    sfc: cases ? ROUND(standard/cases) : null,
    delta: cases ? ROUND((freight-standard)/cases) : null,
    totalLoads: new Set(rows.map(r=>r.loadId).filter(Boolean)).size,
    // Mapping explicitly says Count(PO_Number), not distinct; confirm with BI owner.
    totalPOs: rows.filter(r=>r.poNumber).length,
    totalCases: cases,
    totalSpend: ROUND(freight),
    lastRefreshDate: refreshDate
  };
}
function createMockAuditService(refreshDate='2026-10-30T04:00:00Z') {
  return {
    async getKpis({filters}) { return makeKpis(filteredRows(records,filters),refreshDate); },
    async getRecords(options) { return paginateRecords(filteredRows(records,options.filters),options); }
  };
}
module.exports = { makeKpis, createMockAuditService };
