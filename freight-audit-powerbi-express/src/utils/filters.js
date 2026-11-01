'use strict';
const { badRequest } = require('./errors');
const FILTER_NAMES = ['startDate','endDate','division','vendor','account','loadNumber','poNumber','item','shipMethod','priceCategory','freightCategory','newLaneFlag'];
const SORT_FIELDS = ['receivedDate','division','loadId','poNumber','vendorName','cases','freightCost','variance','afc','sfc'];
const DIMS = ['DC','Load','PO','Vendor','ALL'];
function single(query, key) {
  const v = query[key];
  if (Array.isArray(v) || (v !== undefined && typeof v !== 'string' && typeof v !== 'number')) throw badRequest(`${key} must have one value`);
  return v === undefined ? undefined : String(v).trim();
}
function safeDate(value, key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) !== value) throw badRequest(`${key} must be YYYY-MM-DD`);
  return value;
}
function boundedInt(value,key,def,max) {
  if (value === undefined) return def;
  if (!/^[0-9]+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > max) throw badRequest(`${key} must be 1..${max}`);
  return Number(value);
}
function parseAuditQuery(query = {}, forRecords = false) {
  for (const key of Object.keys(query)) {
    if (![...FILTER_NAMES,'dimension','page','pageSize','sortBy','sortDir'].includes(key)) throw badRequest(`Unsupported query parameter: ${key}`);
  }
  const filters = {};
  for (const key of FILTER_NAMES) {
    const value = single(query,key);
    if (value === undefined || value === '') continue;
    if (value.length > 100 || !/^[\p{L}\p{N} _.,'&+\-\/]+$/u.test(value)) throw badRequest(`Invalid ${key}`);
    filters[key] = value;
  }
  for (const key of ['startDate','endDate']) if (filters[key]) safeDate(filters[key],key);
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) throw badRequest('startDate must be before endDate');
  if (filters.newLaneFlag && !['true','false'].includes(filters.newLaneFlag.toLowerCase())) throw badRequest('newLaneFlag must be true or false');
  if (filters.newLaneFlag) filters.newLaneFlag = filters.newLaneFlag.toLowerCase();
  if (!forRecords) {
    for (const key of ['dimension','page','pageSize','sortBy','sortDir']) if (query[key] !== undefined) throw badRequest(`${key} applies only to /records`);
    return { filters };
  }
  const dimension = single(query,'dimension') || 'DC';
  if (!DIMS.includes(dimension)) throw badRequest('dimension must be DC, Load, PO, Vendor, or ALL');
  const page = boundedInt(single(query,'page'), 'page', 1, 100000);
  const pageSize = boundedInt(single(query,'pageSize'), 'pageSize', 50, 100);
  const sortBy = single(query,'sortBy') || ({DC:'division',Load:'loadId',PO:'poNumber',Vendor:'vendorName',ALL:'receivedDate'}[dimension]);
  if (!SORT_FIELDS.includes(sortBy)) throw badRequest(`sortBy must be one of ${SORT_FIELDS.join(', ')}`);
  const sortDir = (single(query,'sortDir') || 'asc').toLowerCase();
  if (!['asc','desc'].includes(sortDir)) throw badRequest('sortDir must be asc or desc');
  return { filters, dimension, page, pageSize, sortBy, sortDir };
}
function filteredRows(rows, filters) {
  const match = (v, filter) => filter === undefined || String(v ?? '').toLowerCase() === String(filter).toLowerCase();
  return rows.filter(r => {
    if (filters.startDate && r.receivedDate < filters.startDate) return false;
    if (filters.endDate && r.receivedDate > filters.endDate) return false;
    if (!match(r.division,filters.division)) return false;
    if (filters.vendor && ![r.vendorId,r.vendorName].some(v => match(v,filters.vendor))) return false;
    if (!match(r.account,filters.account)) return false;
    if (!match(r.loadId,filters.loadNumber)) return false;
    if (!match(r.poNumber,filters.poNumber)) return false;
    if (!match(r.item,filters.item)) return false;
    if (!match(r.shipMethod,filters.shipMethod)) return false;
    if (!match(r.priceCategory,filters.priceCategory)) return false;
    if (!match(r.freightCategory,filters.freightCategory)) return false;
    if (!match(String(r.newLaneFlag),filters.newLaneFlag)) return false;
    return true;
  });
}
function paginateRecords(rows, options) {
  const sorted = [...rows].sort((a,b) => {
    const av = a[options.sortBy], bv = b[options.sortBy];
    const v = (typeof av === 'number' && typeof bv === 'number') ? av-bv : String(av??'').localeCompare(String(bv??''), 'en', {numeric:true});
    return (v || String(a.id).localeCompare(String(b.id))) * (options.sortDir === 'desc' ? -1 : 1);
  });
  return { totalCount: sorted.length, page: options.page, pageSize: options.pageSize, items: sorted.slice((options.page-1)*options.pageSize, options.page*options.pageSize) };
}
module.exports = { FILTER_NAMES, parseAuditQuery, filteredRows, paginateRecords };
