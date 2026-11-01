'use strict';
const crypto = require('node:crypto');
// DEMO gate ONLY. Replace with trusted portal session/JWT verification, role entitlements and RLS design.
// Never expose this token in browser bundles or source control.
function demoTokenGuard(config) {
  return (req,res,next) => {
    if (config.source !== 'powerbi') return next();
    const supplied = (req.get('Authorization') || '').replace(/^Bearer\s+/i,'');
    const expected = config.portalApiToken;
    const a=Buffer.from(supplied),b=Buffer.from(expected);
    if (!supplied || a.length!==b.length || !crypto.timingSafeEqual(a,b)) return res.status(401).json({error:'Unauthorized',code:'UNAUTHORIZED'});
    return next();
  };
}
module.exports = { demoTokenGuard };
