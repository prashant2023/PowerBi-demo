import express from 'express';
import { makeDashboard, mockRows, PERIODS } from './data.mjs';
import { loadPowerBiRows } from './powerbi.mjs';

export function createApp({ env = process.env, powerBiLoader = loadPowerBiRows, now = () => new Date() } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

  app.get('/api/health', (_req, res) => {
    const source = (env.DATA_SOURCE || 'mock').toLowerCase();
    const required = ['POWERBI_TENANT_ID', 'POWERBI_CLIENT_ID', 'POWERBI_CLIENT_SECRET', 'POWERBI_WORKSPACE_ID', 'POWERBI_DATASET_ID'];
    res.json({ ok: true, source, configured: source === 'mock' || (source === 'powerbi' && required.every((key) => Boolean(env[key]))) });
  });

  app.get('/api/kpis', async (req, res) => {
    const period = String(req.query.period || '30d');
    if (!PERIODS[period]) return res.status(400).json({ error: 'Invalid period. Choose 7d, 30d or 90d.' });
    const source = (env.DATA_SOURCE || 'mock').toLowerCase();
    if (source !== 'mock' && source !== 'powerbi') return res.status(500).json({ error: 'DATA_SOURCE must be mock or powerbi' });
    try {
      const clock = now();
      const rows = source === 'mock' ? mockRows(clock) : await powerBiLoader(env, undefined, clock);
      return res.json(makeDashboard(rows, period, source, clock));
    } catch (error) {
      console.error('KPI request failed:', error.message);
      // Do not reflect raw vendor responses or access tokens to the browser.
      const safeMessage = /^(Missing Power BI|Invalid Power BI|Power BI )/.test(error.message)
        ? error.message : 'Unable to load Power BI data. Check the server logs.';
      return res.status(502).json({ error: safeMessage });
    }
  });

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  return app;
}
