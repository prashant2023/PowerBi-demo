'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {compileApprovedDax}=require('../src/powerbi/queries');
const {mapKpiRows,mapRecordRows}=require('../src/powerbi/mapper');
const {createExecuteQueriesClient}=require('../src/powerbi/client');
const {createPowerBiAuditService}=require('../src/services/powerbiAuditService');
const {parseAuditQuery}=require('../src/utils/filters');
const {configFromEnv,validateConfig}=require('../src/config');

test('DAX template substitutes only approved filter placeholders',()=>{
  const dax=compileApprovedDax('EVALUATE ROW("Div", {{DIVISION}}, "From", {{STARTDATE}})',{division:'Carolina',startDate:'2026-10-01'});
  assert.ok(dax.includes('"Carolina"')); assert.ok(dax.includes('"2026-10-01"'));
  assert.throws(()=>compileApprovedDax('EVALUATE ROW("x",1)',{division:'Carolina'}),/does not support filter/);
});
test('Power BI JSON schema mapper recognizes [alias] and rejects missing values',()=>{
  const r=mapKpiRows([{'[afc]':1.86,'[sfc]':1.92,'[delta]':-.06,'[totalLoads]':482,'[totalPOs]':1480,'[totalCases]':12000,'[totalSpend]':1572072}]);
  assert.equal(r.afc,1.86); assert.equal(r.totalLoads,482); assert.equal(r.lastRefreshDate,null);
  assert.throws(()=>mapKpiRows([{'[afc]':1.86}]),/Missing mapped KPI field/);
  assert.equal(mapRecordRows([{'[id]':'LD-1-PO-1','[division]':'Carolina','[loadId]':'LD-1','[poNumber]':'PO-1','[receivedDate]':'2026-10-28','[cases]':1520,'[afc]':1.84}])[0].cases,1520);
});
test('Execute Queries client sends POST to in-group Power BI API without exposing token',async()=>{
  let requested;
  const client=createExecuteQueriesClient({workspaceId:'w',datasetId:'d',timeoutMs:5000},{getToken:async()=> 'test-secret',fetchImpl:async(url,opts)=>{
    requested={url,opts};
    return {ok:true,json:async()=>({results:[{tables:[{rows:[{'[afc]':1.86}]}]}]})};
  }});
  const result=await client('EVALUATE ROW("afc",1.86)');
  assert.equal(result.length,1);
  assert.match(requested.url,/groups\/w\/datasets\/d\/executeQueries$/);
  assert.equal(requested.opts.method,'POST');
  assert.equal(JSON.parse(requested.opts.body).queries.length,1);
  assert.equal(requested.opts.headers.Authorization,'Bearer test-secret');
});
test('live adapter uses reviewed KPI mapping and limits demo division scope',async()=>{
  let calls=0;
  const settings={kpiQueryFile:'k',recordsQueryFile:'r',allowedDivisions:'Carolina'};
  const svc=createPowerBiAuditService(settings,{
    loadQuery: f=>f==='k'?'EVALUATE ROW("division",{{DIVISION}})':'EVALUATE ROW("division",{{DIVISION}})',
    execute:async(dax)=>{calls++;return [{'[afc]':1.86,'[sfc]':1.92,'[delta]':-.06,'[totalLoads]':5,'[totalPOs]':8,'[totalCases]':1000,'[totalSpend]':1860}];}
  });
  const r=await svc.getKpis({filters:{division:'Carolina'}});
  assert.equal(r.delta,-.06);assert.equal(calls,1);
  await assert.rejects(()=>svc.getKpis({filters:{division:'Dallas'}}),/Division filter/);
});
test('live config fails closed if RLS status and approved queries are missing',()=>{
  const raw=configFromEnv({DATA_SOURCE:'powerbi',PORTAL_API_TOKEN:'a'.repeat(30),POWERBI_QUERIES_REVIEWED:'true',POWERBI_ALLOWED_DIVISIONS:'Carolina',POWERBI_MODEL_RLS:'unknown'});
  assert.throws(()=>validateConfig(raw),/RLS\/SSO/);
});
