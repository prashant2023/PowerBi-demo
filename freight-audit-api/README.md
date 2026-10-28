# Freight Audit Controls — Backend KPI API

A **Node.js backend only** for the four sample KPI cards in the Freight Audit Controls screenshot. No React, Cognos, or actual Power BI connection. This is a small standalone demo API and **not** the finalized endpoint contract from the Web Portals LLD.

## KPIs

| Field | Screenshot example | Additional information |
| --- | --- | --- |
| `freightCostDelta` | -$0.06/case | `status: on_track` |
| `costPerCase` | $1.86/case | `varianceVsStandard: -0.06`, `openItems: 1` |
| `ytdVariance` | $2.1M unfavorable | `monthToDateChange: 340000`, `openItems: 1`, `status: action` |
| `auditExceptions` | 2,685 | `weekOverWeekPercent: 18`, `status: watch` |

**All four values are mock/sample data.** These values are copied from a screenshot, not taken from live data.

## Start the API (Windows CMD or PowerShell)

1. Install approved Node.js version 20 or newer.
2. Open a terminal inside this folder.
3. Run:

```sh
npm run dev
```

No `npm install` is required: this version only uses Node.js built-in modules, so missing `dotenv` or `express` packages will not block the demo.

### Test it

Open in a browser:

- http://127.0.0.1:4000/api/health
- http://127.0.0.1:4000/api/freight/audit-controls/kpis

Or PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:4000/api/freight/audit-controls/kpis | ConvertTo-Json -Depth 6
```

Test the API:

```sh
npm test
```

## Where is the API implemented?

- `src/app.mjs` — HTTP routes (GET `/api/health`, GET `/api/freight/audit-controls/kpis`)
- `src/kpis.mjs` — dummy data for four KPI cards
- `src/index.mjs` — launches HTTP server, defaults to localhost:4000
- `tests/api.test.mjs` — automated API tests

## Example response

```json
{
  "dashboard": "freight-audit-controls",
  "source": "mock",
  "sampleData": true,
  "period": "P06",
  "generatedAt": "2026-10-28T00:00:00.000Z",
  "kpis": {
    "freightCostDelta": { "label": "Freight Cost Delta", "value": -0.06, "unit": "USD/case", "status": "on_track" },
    "costPerCase": { "label": "Cost per case", "value": 1.86, "unit": "USD/case", "varianceVsStandard": -0.06, "openItems": 1, "status": "on_track" },
    "ytdVariance": { "label": "YTD variance", "value": 2100000, "unit": "USD", "favorability": "unfavorable", "monthToDateChange": 340000, "openItems": 1, "status": "action" },
    "auditExceptions": { "label": "Audit exceptions", "value": 2685, "unit": "count", "weekOverWeekPercent": 18, "status": "watch" }
  }
}
```

`generatedAt` is set to the current server time on each request. It does **not** mean the sample data has been refreshed from Power BI.

## Add endpoint to the existing Freight backend instead

If your current backend **already** has Express (`app`), you do **not** need another server. Copy this route into the current Express app (before its 404 handler):

```js
import { getFreightAuditKpis } from './kpis.mjs';

app.get('/api/freight/audit-controls/kpis', (_req, res) => {
  res.json(getFreightAuditKpis());
});
```

Also copy `src/kpis.mjs` into the same directory as the file importing it; otherwise adjust the relative import. Coordinate changes to a company repo with the team.

## Connect to Power BI later

Once permissions and a Power BI semantic model are available, replace `getFreightAuditKpis()` with an adapter that obtains an authorized token, queries approved semantic model measures, normalizes fields, and enforces the approved user and row permissions. Do **not** assume Power BI service-principal access implements the RLS model in your LLD. The authentication and authorization method must be agreed with your architecture/security team. Keep tokens and secrets server-side.

## Deployment notes

- Local default: `HOST=127.0.0.1`, `PORT=4000`.
- To bind on another interface, get IT approval and set `HOST` using an environment variable.
- If a separately hosted browser UI needs CORS, set `CORS_ORIGIN` to its exact approved origin (for example, `http://localhost:5173`) before starting the server. Otherwise, this backend intentionally does not allow arbitrary cross-origin browsers.
- **No authentication is implemented** because this is a local mock-data demo. Do not deploy publicly or connect to live company data without SSO, authorization, audit logging and production controls.
