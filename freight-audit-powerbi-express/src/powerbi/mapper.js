'use strict';
const {ApiError}=require('../utils/errors');
function getCol(row,key) {
  if (!row || typeof row !== 'object') return undefined;
  const entries=Object.entries(row);
  const exact=entries.find(([k])=> k===key || k===`[${key}]`);
  if (exact) return exact[1];
  const alt=entries.find(([k])=> k.toLowerCase()===key.toLowerCase() || k.toLowerCase().endsWith(`[${key.toLowerCase()}]`));
  return alt?.[1];
}
function getNumber(row,key,{nullable=false}={}) {
  const raw=getCol(row,key);
  if (nullable && (raw===null || raw===undefined || raw==='')) return null;
  if (raw===null || raw===undefined || raw==='') throw new ApiError(502,'POWERBI_MAPPING_MISSING',`Missing mapped KPI field: ${key}`);
  const n=Number(raw);
  if (!Number.isFinite(n)) throw new ApiError(502,'POWERBI_MAPPING_INVALID',`Invalid numeric field: ${key}`);
  return n;
}
function mapKpiRows(rows) {
  if (!rows.length) throw new ApiError(502,'POWERBI_KPI_EMPTY','KPI query returned no rows');
  const r=rows[0];
  return {
    afc:getNumber(r,'afc'), sfc:getNumber(r,'sfc'), delta:getNumber(r,'delta'),
    totalLoads:getNumber(r,'totalLoads'),totalPOs:getNumber(r,'totalPOs'),
    totalCases:getNumber(r,'totalCases'),totalSpend:getNumber(r,'totalSpend'),
    // No fake refresh timestamp: BI owner should return this from a refreshed model column/measure.
    lastRefreshDate:getCol(r,'lastRefreshDate') ?? null
  };
}
const stringKeys=['id','division','account','loadId','poNumber','shipMethod','vendorId','vendorName','item','priceCategory','freightCategory','receivedDate','status'];
const numberKeys=['miles','pallets','cases','weight','cube','utilizationPercent','sfc','afc','delta','freightCost','standardCost','variance','impact','margin'];
const linehaulKeys=['mbmLinehaul','contracted3PLLinehaul','vendorDelivery','cust3PLLinehaul'];
const surchargeKeys=['fsc','unloadingLabor','truckDetention','managementFee','layover','palletCharge','stopOffCharge','billback','misc','facFuelSurcharge','truckDetentionUnused','outOfRouteMiles','unusedVehicleOrdered','extraordinaryFreightCredit','return','deadhead'];
function mapRecordRows(rows) {
  return rows.map((r,i)=>{
    const out={};
    for(const k of stringKeys) out[k]=getCol(r,k) == null ? null : String(getCol(r,k));
    for(const k of numberKeys) out[k]=getNumber(r,k,{nullable:true});
    // Power BI may serialize dates as ISO timestamps; keep the client contract YYYY-MM-DD.
    if (out.receivedDate && /^\d{4}-\d{2}-\d{2}/.test(out.receivedDate)) out.receivedDate=out.receivedDate.slice(0,10);
    const flag=getCol(r,'newLaneFlag');
    out.newLaneFlag=flag==null?null:(flag===true || flag===1 || String(flag).toLowerCase()==='true');
    out.linehaul=Object.fromEntries(linehaulKeys.map(k=>[k,getNumber(r,k,{nullable:true})]));
    out.surcharges=Object.fromEntries(surchargeKeys.map(k=>[k,getNumber(r,k,{nullable:true})]));
    if (!out.id || !out.division || !out.loadId || !out.poNumber || !out.receivedDate) throw new ApiError(502,'POWERBI_RECORD_MISSING',`Record mapping missing required identity/date fields (row ${i+1})`);
    return out;
  });
}
module.exports={getCol,mapKpiRows,mapRecordRows};
