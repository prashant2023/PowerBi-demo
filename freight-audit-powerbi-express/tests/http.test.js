'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createApp}=require('../src/app');
const {configFromEnv}=require('../src/config');

async function withServer(fn) {
  const server=createApp(configFromEnv({DATA_SOURCE:'mock'})).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  try {await fn(`http://127.0.0.1:${server.address().port}`);} finally {await new Promise(resolve=>server.close(resolve));}
}
test('GET /api/health returns mock source',async()=>withServer(async base=>{
  const r=await fetch(base+'/api/health');
  assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true,source:'mock'});
}));
test('GET /api/v1/audit/kpis preserves mapping contract',async()=>withServer(async base=>{
  const r=await fetch(base+'/api/v1/audit/kpis?division=Carolina');
  assert.equal(r.status,200);assert.equal(r.headers.get('x-sample-data'),'true');
  const data=await r.json();
  assert.deepEqual(Object.keys(data),['afc','sfc','delta','totalLoads','totalPOs','totalCases','totalSpend','lastRefreshDate']);
  assert.ok(data.totalLoads>0);
}));
test('GET /api/v1/audit/records supports paging and filters',async()=>withServer(async base=>{
  const r=await fetch(base+'/api/v1/audit/records?division=Carolina&dimension=Load&page=1&pageSize=4');
  assert.equal(r.status,200);
  const data=await r.json();
  assert.equal(data.pageSize,4);assert.equal(data.items.length,4);
  assert.equal(data.items.every(r=>r.division==='Carolina'),true);
  assert.ok(data.items[0].linehaul); assert.ok(data.items[0].surcharges);
}));
test('invalid filtering returns 400; wrong path 404',async()=>withServer(async base=>{
  const r=await fetch(base+'/api/v1/audit/records?sortBy=codeInjection');
  assert.equal(r.status,400);
  const notfound=await fetch(base+'/api/v1/audit');
  assert.equal(notfound.status,404);
}));
