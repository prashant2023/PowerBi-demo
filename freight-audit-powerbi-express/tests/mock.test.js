'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseAuditQuery,filteredRows} = require('../src/utils/filters');
const {EXAMPLE_RECORD,createMockRecords}=require('../src/mock/records');
const {makeKpis,createMockAuditService}=require('../src/services/mockAuditService');

test('documented example record maps exactly to the visible snapshot',()=>{
  assert.equal(EXAMPLE_RECORD.id,'LD-804821-PO-229140');
  assert.equal(EXAMPLE_RECORD.division,'Carolina');
  assert.equal(EXAMPLE_RECORD.cases,1520);
  assert.equal(EXAMPLE_RECORD.afc,1.84);
  assert.equal(EXAMPLE_RECORD.sfc,1.90);
  assert.equal(EXAMPLE_RECORD.delta,-0.06);
  assert.equal(EXAMPLE_RECORD.freightCost,2796.80);
  assert.equal(EXAMPLE_RECORD.standardCost,2888.00);
  assert.equal(EXAMPLE_RECORD.variance,-91.20);
  assert.equal(EXAMPLE_RECORD.surcharges.fsc,320);
  assert.equal(EXAMPLE_RECORD.linehaul.mbmLinehaul,2100);
});
test('mock KPI matches document contract and weighted per-case totals',()=>{
  const result=makeKpis([EXAMPLE_RECORD],'2026-10-30T04:00:00Z');
  assert.deepEqual(result,{afc:1.84,sfc:1.9,delta:-0.06,totalLoads:1,totalPOs:1,totalCases:1520,totalSpend:2796.8,lastRefreshDate:'2026-10-30T04:00:00Z'});
});
test('filters work for date, division, vendor, freightCategory and PO',()=>{
  const records=createMockRecords();
  const q=parseAuditQuery({startDate:'2026-10-28',endDate:'2026-10-28',division:'Carolina',vendor:"Denny's",poNumber:'PO-229140',freightCategory:'Frozen'});
  const selected=filteredRows(records,q.filters);
  assert.equal(selected.length,1);
  assert.equal(selected[0].id,EXAMPLE_RECORD.id);
});
test('records paginate; totals computed from filtered subset, not hardcoded',async()=>{
  const service=createMockAuditService();
  const args=parseAuditQuery({dimension:'Vendor',vendor:"Denny's",page:'2',pageSize:'7'},true);
  const page=await service.getRecords(args);
  const kpi=await service.getKpis({filters:args.filters});
  assert.equal(page.page,2); assert.equal(page.pageSize,7);
  assert.equal(page.items.length,7);
  assert.ok(page.totalCount>7);
  assert.equal(kpi.totalPOs,page.totalCount);
  assert.equal(page.items.every(x=>x.vendorName==="Denny's"),true);
});
test('invalid dates, raw DAX, sort keys and page sizes are rejected',()=>{
  assert.throws(()=>parseAuditQuery({startDate:'2026-02-30'}),/YYYY-MM-DD/);
  assert.throws(()=>parseAuditQuery({query:'EVALUATE ROW(1)'}),/Unsupported/);
  assert.throws(()=>parseAuditQuery({sortBy:'freightCost;DROP',dimension:'DC'},true),/sortBy/);
  assert.throws(()=>parseAuditQuery({pageSize:'1000'},true),/pageSize/);
});
