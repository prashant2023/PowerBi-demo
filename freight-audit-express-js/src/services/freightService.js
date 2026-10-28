'use strict';

/**
 * SAMPLE DATA ONLY, transcribed from the Audit Controls demo screenshot.
 * This is not a Power BI integration or a real freight KPI calculation.
 * A real adapter can replace this function without changing the API contract.
 */
function getFreightAuditKpis(now = new Date()) {
  return {
    dashboard: 'freight-audit-controls',
    source: 'mock',
    sampleData: true,
    period: 'P06',
    generatedAt: now.toISOString(),
    kpis: {
      freightCostDelta: {
        label: 'Freight Cost Delta',
        value: -0.06,
        unit: 'USD/case',
        status: 'on_track'
      },
      costPerCase: {
        label: 'Cost per case',
        value: 1.86,
        unit: 'USD/case',
        varianceVsStandard: -0.06,
        openItems: 1,
        status: 'on_track'
      },
      ytdVariance: {
        label: 'YTD variance',
        value: 2100000,
        unit: 'USD',
        favorability: 'unfavorable',
        monthToDateChange: 340000,
        openItems: 1,
        status: 'action'
      },
      auditExceptions: {
        label: 'Audit exceptions',
        value: 2685,
        unit: 'count',
        weekOverWeekPercent: 18,
        status: 'watch'
      }
    }
  };
}

module.exports = { getFreightAuditKpis };
