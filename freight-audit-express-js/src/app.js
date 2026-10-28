'use strict';

const express = require('express');
const { createFreightRouter } = require('./routes/freightRoutes');

// Export Express app for tests and for mounting in an existing backend.
function createApp({ now = () => new Date(), allowedOrigin = process.env.CORS_ORIGIN } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.disable('etag');
  app.use(express.json({ limit: '10kb' }));

  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    // No permissive wildcard CORS. Allow only an explicitly configured UI origin.
    if (allowedOrigin && req.get('Origin') === allowedOrigin) {
      res.set('Access-Control-Allow-Origin', allowedOrigin);
      res.vary('Origin');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, source: 'mock' });
  });

  app.use('/api/freight', createFreightRouter({ now }));
  app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found' }));
  return app;
}

module.exports = { createApp };
