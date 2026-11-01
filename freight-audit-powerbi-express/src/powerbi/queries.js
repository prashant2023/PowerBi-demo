'use strict';
const fs=require('node:fs');
const path=require('node:path');
const { ApiError }=require('../utils/errors');
const { FILTER_NAMES }=require('../utils/filters');
const TOKENS = Object.fromEntries(FILTER_NAMES.map(n=>[n,'{{'+n.toUpperCase()+'}}']));

function loadReviewedQuery(file) {
  const absolute = path.resolve(process.cwd(),file);
  if (!fs.existsSync(absolute)) throw new Error(`BI owner-approved DAX file not found: ${file}. See queries/README.md`);
  const query=fs.readFileSync(absolute,'utf8').trim();
  if (!/^EVALUATE\b/i.test(query.replace(/^\/\*[\s\S]*?\*\/\s*/,'')) && !/\bEVALUATE\b/i.test(query)) {
    throw new Error('Approved DAX must contain EVALUATE');
  }
  return query;
}
function daxLiteral(value) {
  if (value===undefined) return 'BLANK()';
  // DAX strings escape quotes by doubling them; input was validated before reaching here.
  return '"' + String(value).replace(/"/g,'""') + '"';
}
function compileApprovedDax(template, filters) {
  let out=template;
  for (const [key,marker] of Object.entries(TOKENS)) {
    if (filters[key] !== undefined && !out.includes(marker)) {
      throw new ApiError(422,'FILTER_NOT_SUPPORTED',`Approved Power BI query does not support filter: ${key}`);
    }
    out=out.split(marker).join(daxLiteral(filters[key]));
  }
  if (/\{\{[^}]+\}\}/.test(out)) throw new ApiError(500,'QUERY_TEMPLATE_INVALID','Unrecognized DAX template placeholder');
  return out;
}
module.exports = { loadReviewedQuery, compileApprovedDax, daxLiteral };
