'use strict';

const { getFreightAuditKpis } = require('../services/freightService');

function createGetAuditKpisController({ now = () => new Date() } = {}) {
  return function getAuditKpis(_req, res) {
    return res.status(200).json(getFreightAuditKpis(now()));
  };
}

module.exports = { createGetAuditKpisController };
