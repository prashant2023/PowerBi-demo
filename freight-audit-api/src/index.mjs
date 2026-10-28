import { createApp } from './app.mjs';

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

createApp().listen(port, host, () => {
  console.log(`Freight Audit KPI API: http://${host}:${port}/api/freight/audit-controls/kpis`);
  console.log('Data source: MOCK (sample values; no Power BI connection)');
});
