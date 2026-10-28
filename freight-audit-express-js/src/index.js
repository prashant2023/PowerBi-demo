'use strict';

const { createApp } = require('./app');

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '127.0.0.1';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

const app = createApp();
app.listen(port, host, () => {
  console.log(`Express API running at http://${host}:${port}`);
  console.log(`GET http://${host}:${port}/api/health`);
  console.log(`GET http://${host}:${port}/api/freight/audit-controls/kpis`);
  console.log('Sample data only. No Power BI connection.');
});
