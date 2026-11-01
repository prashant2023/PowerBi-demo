'use strict';

function configFromEnv(env = process.env) {
  return {
    source: (env.DATA_SOURCE || 'mock').toLowerCase(),
    port: Number(env.PORT || 4000),
    host: env.HOST || '127.0.0.1',
    corsOrigin: env.CORS_ORIGIN || '',
    portalApiToken: env.PORTAL_API_TOKEN || '',
    mockRefreshDate: env.MOCK_REFRESH_DATE || '2026-10-30T04:00:00Z',
    powerbi: {
      authMethod: env.POWERBI_AUTH_METHOD || 'client_secret',
      tenantId: env.ENTRA_TENANT_ID || '',
      clientId: env.ENTRA_CLIENT_ID || '',
      clientSecret: env.ENTRA_CLIENT_SECRET || '',
      workspaceId: env.POWERBI_WORKSPACE_ID || '',
      datasetId: env.POWERBI_DATASET_ID || '',
      kpiQueryFile: env.POWERBI_KPI_QUERY_FILE || 'queries/approved-kpis.dax',
      recordsQueryFile: env.POWERBI_RECORDS_QUERY_FILE || 'queries/approved-records.dax',
      reviewed: env.POWERBI_QUERIES_REVIEWED === 'true',
      modelRls: env.POWERBI_MODEL_RLS || 'unknown',
      timeoutMs: Number(env.POWERBI_TIMEOUT_MS || 15000),
      allowedDivisions: env.POWERBI_ALLOWED_DIVISIONS || ''
    }
  };
}

function validateConfig(config) {
  if (!['mock','powerbi'].includes(config.source)) throw new Error('DATA_SOURCE must be mock or powerbi');
  if (!Number.isSafeInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error('Invalid PORT');
  if (config.source === 'powerbi') {
    if (!config.portalApiToken || config.portalApiToken.length < 24) throw new Error('Live demo requires PORTAL_API_TOKEN (24+ characters). Replace with the corporate portal auth middleware before production');
    if (!config.powerbi.reviewed) throw new Error('Live mode requires POWERBI_QUERIES_REVIEWED=true and BI owner-approved DAX files');
    if (!config.powerbi.allowedDivisions) throw new Error('Set POWERBI_ALLOWED_DIVISIONS to approved demo scope; production must use portal user entitlements');
    if (config.powerbi.modelRls !== 'disabled-confirmed') throw new Error('Service-principal Execute Queries cannot be enabled until RLS/SSO status is confirmed as unsupported/absent. Use approved alternative if enabled');
    for (const key of ['tenantId','clientId','clientSecret','workspaceId','datasetId']) {
      if (!config.powerbi[key]) throw new Error(`Missing Power BI config: ${key}`);
    }
    if (config.powerbi.authMethod !== 'client_secret') throw new Error('This sample implements client_secret auth only. Federated/certificate flow needs approved identity adapter');
  }
  return config;
}
module.exports = { configFromEnv, validateConfig };
