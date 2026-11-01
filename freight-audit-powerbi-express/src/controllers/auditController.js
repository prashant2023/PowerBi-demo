'use strict';
const { parseAuditQuery } = require('../utils/filters');
function createAuditController(auditService, source) {
  return {
    getKpis: async (req,res,next) => {
      try {
        const input = parseAuditQuery(req.query,false);
        const result = await auditService.getKpis(input);
        res.set('X-Data-Source',source);
        if (source === 'mock') res.set('X-Sample-Data','true');
        res.json(result);
      } catch(e) { next(e); }
    },
    getRecords: async (req,res,next) => {
      try {
        const input = parseAuditQuery(req.query,true);
        const result = await auditService.getRecords(input);
        res.set('X-Data-Source',source);
        if (source === 'mock') res.set('X-Sample-Data','true');
        res.json(result);
      } catch(e) { next(e); }
    }
  };
}
module.exports = { createAuditController };
