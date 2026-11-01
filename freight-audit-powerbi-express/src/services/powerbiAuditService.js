'use strict';
const { ApiError }=require('../utils/errors');
const { loadReviewedQuery,compileApprovedDax }=require('../powerbi/queries');
const { createExecuteQueriesClient }=require('../powerbi/client');
const {mapKpiRows,mapRecordRows}=require('../powerbi/mapper');
const {filteredRows,paginateRecords}=require('../utils/filters');

function createPowerBiAuditService(settings,{execute,loadQuery=loadReviewedQuery}={}) {
  const kpiQuery=loadQuery(settings.kpiQueryFile);
  const recordsQuery=loadQuery(settings.recordsQueryFile);
  const call=execute || createExecuteQueriesClient(settings);
  const allowedDivisions=(settings.allowedDivisions||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  function checkedFilters(filters) {
    // Demo-only restrict scope to an explicitly configured division; production must enforce the actual signed-in user's entitlements.
    if (!filters.division || !allowedDivisions.includes(filters.division.toLowerCase())) {
      throw new ApiError(403,'DIVISION_NOT_AUTHORIZED','Division filter is required and must be approved for this demo');
    }
    return filters;
  }
  return {
    async getKpis({filters}) {
      checkedFilters(filters);
      const rows=await call(compileApprovedDax(kpiQuery,filters));
      return mapKpiRows(rows);
    },
    async getRecords(options) {
      checkedFilters(options.filters);
      const raw=await call(compileApprovedDax(recordsQuery,options.filters));
      // Local pagination is only a bounded POC strategy. Replace with BI-reviewed server-side DAX pagination for production.
      if (raw.length>=5000) throw new ApiError(503,'PAGINATION_REQUIRES_DAX','Too many rows for local POC pagination; implement reviewed paginated DAX');
      const mapped=mapRecordRows(raw);
      return paginateRecords(filteredRows(mapped,options.filters),options);
    }
  };
}
module.exports={createPowerBiAuditService};
