'use strict';
const {ApiError}=require('../utils/errors');
function createExecuteQueriesClient(settings,{getToken,fetchImpl=globalThis.fetch}={}) {
  if (!fetchImpl) throw new Error('Node >=20 required: fetch missing');
  const tokenProvider=getToken || require('./auth').createPowerBiTokenProvider(settings);
  const endpoint=`https://api.powerbi.com/v1.0/myorg/groups/${encodeURIComponent(settings.workspaceId)}/datasets/${encodeURIComponent(settings.datasetId)}/executeQueries`;
  return async function execute(dax) {
    const token=await tokenProvider();
    let response;
    try {
      response=await fetchImpl(endpoint,{
        method:'POST',
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({queries:[{query:dax}],serializerSettings:{includeNulls:true}}),
        signal:AbortSignal.timeout(settings.timeoutMs||15000)
      });
    } catch(e) {throw new ApiError(502,'POWERBI_NETWORK_FAILURE','Unable to connect to Power BI');}
    if (!response.ok) {
      // Never expose upstream response text (which may contain raw DAX or detailed data).
      const status = response.status===429?503:502;
      throw new ApiError(status,`POWERBI_HTTP_${response.status}`,'Power BI query request failed');
    }
    let json;
    try{ json=await response.json(); }catch(e){throw new ApiError(502,'POWERBI_INVALID_JSON','Power BI returned invalid JSON');}
    if (json.error || json.results?.[0]?.error || json.results?.[0]?.tables?.[0]?.error) {
      throw new ApiError(502,'POWERBI_QUERY_ERROR','Power BI returned a query error');
    }
    const rows=json.results?.[0]?.tables?.[0]?.rows;
    if (!Array.isArray(rows)) throw new ApiError(502,'POWERBI_UNEXPECTED_SHAPE','Missing results[0].tables[0].rows');
    return rows;
  };
}
module.exports={createExecuteQueriesClient};
