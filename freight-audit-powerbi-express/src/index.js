'use strict';
require('dotenv').config();
const {configFromEnv,validateConfig}=require('./config');
const {createApp}=require('./app');
try {
  const config=validateConfig(configFromEnv());
  createApp(config).listen(config.port,config.host,()=>{
    console.log(`Freight Audit ${config.source.toUpperCase()} API listening on http://${config.host}:${config.port}`);
    console.log('GET /api/v1/audit/kpis and GET /api/v1/audit/records');
  });
} catch(e) { console.error('Configuration error:', e.message); process.exitCode=1; }
