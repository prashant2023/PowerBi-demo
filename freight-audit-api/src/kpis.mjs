/**
 * Mock data based on the four example cards in the Audit Controls screenshot.
 * Replace ONLY this provider with an approved Power BI data adapter later.
 * Values are NOT live, actual, or representative of company performance.
 */
export function getFreightAuditKpis(now = new Date()) {
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
