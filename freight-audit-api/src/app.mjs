import { createServer } from 'node:http';
import { getFreightAuditKpis } from './kpis.mjs';

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

/** Node.js built-in HTTP server: no packages to install. */
export function createApp({ now = () => new Date(), allowedOrigin = process.env.CORS_ORIGIN } = {}) {
  return createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Optional access from an explicitly approved frontend origin.
    if (allowedOrigin && req.headers.origin === allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return sendJson(res, 405, { error: 'Method not allowed' });
    }

    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    if (pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, source: 'mock' });
    }

    // ONE API call returns ALL FOUR Freight Audit Controls KPIs.
    if (pathname === '/api/freight/audit-controls/kpis') {
      return sendJson(res, 200, getFreightAuditKpis(now()));
    }

    return sendJson(res, 404, { error: 'Endpoint not found' });
  });
}
