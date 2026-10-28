'use strict';

const express = require('express');
const { createGetAuditKpisController } = require('../controllers/freightController');

function createFreightRouter({ now = () => new Date() } = {}) {
  const router = express.Router();
  const path = '/audit-controls/kpis';

  // Returns all four Freight Audit Controls KPI cards in one response.
  router.get(path, createGetAuditKpisController({ now }));
  router.options(path, (_req, res) => res.sendStatus(204));
  router.all(path, (_req, res) => {
    res.set('Allow', 'GET, HEAD, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  });
  return router;
}

module.exports = { createFreightRouter };
