'use strict';
const express = require('express');
const { createAuditRouter } = require('./routes/auditRoutes');
const { createMockAuditService } = require('./services/mockAuditService');
const { createPowerBiAuditService } = require('./services/powerbiAuditService');
const { demoTokenGuard } = require('./middleware/portalAuth');
const { ApiError } = require('./utils/errors');

function createApp(config, injectedService) {
  const app = express();
  app.disable('x-powered-by');
  app.disable('etag');
  app.use(express.json({limit:'10kb'}));
  app.use((req,res,next) => {
    res.set('Cache-Control','no-store'); res.set('X-Content-Type-Options','nosniff');
    if (config.corsOrigin && req.get('Origin')===config.corsOrigin) {
      res.set('Access-Control-Allow-Origin',config.corsOrigin);
      res.set('Access-Control-Allow-Headers','Authorization, Content-Type');
      res.set('Access-Control-Allow-Methods','GET, OPTIONS'); res.vary('Origin');
    }
    if (req.method==='OPTIONS') return res.sendStatus(204);
    next();
  });
  const service = injectedService || (config.source==='mock'
    ? createMockAuditService(config.mockRefreshDate)
    : createPowerBiAuditService(config.powerbi));
  app.get('/api/health',(_req,res)=>res.json({ok:true,source:config.source}));
  app.use('/api/v1/audit', demoTokenGuard(config), createAuditRouter({auditService:service,source:config.source}));
  app.use((_req,res)=>res.status(404).json({error:'Endpoint not found',code:'NOT_FOUND'}));
  app.use((err,req,res,next)=>{
    if (res.headersSent) return next(err);
    if (err instanceof ApiError) return res.status(err.status).json({error:err.message,code:err.code});
    // Avoid exposing upstream token, query, credentials or raw Power BI errors.
    console.error('Audit API error:', {requestId:req.get('x-request-id')||null,code:err.code||'INTERNAL_ERROR',status:err.status||500});
    return res.status(err.status && err.status >=400 && err.status <600 ? err.status : 502)
      .json({error:'Unable to retrieve audit data',code:err.code||'UPSTREAM_FAILURE'});
  });
  return app;
}
module.exports = { createApp };
