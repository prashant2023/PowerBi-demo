'use strict';
const express = require('express');
const { createAuditController } = require('../controllers/auditController');
function createAuditRouter({ auditService, source }) {
  const router = express.Router();
  const ctrl = createAuditController(auditService, source);
  router.get('/kpis',ctrl.getKpis);
  router.get('/records',ctrl.getRecords);
  return router;
}
module.exports = { createAuditRouter };
