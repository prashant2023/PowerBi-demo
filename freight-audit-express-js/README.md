# Freight Audit Controls — Express.js Backend (.js only)

A **backend-only** Express.js project written in standard **CommonJS `.js` files** (`require()` / `module.exports`). It returns sample values for the four KPIs visible on the Freight Cockpit → Audit Controls screen. No React code, real freight data, or Power BI credentials are included.

## API endpoints

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Checks the server status |
| GET | `/api/freight/audit-controls/kpis` | Returns all four Freight Audit Controls KPIs |

These are proposed **demo endpoint paths**; the company's production API contracts have not been verified.

## Start on Windows (VS Code, PowerShell or Command Prompt)

1. Extract the ZIP and open `freight-audit-express-js` in VS Code.
2. Open Terminal in the **root folder** containing `package.json`.
3. Run:

```cmd
npm install
npm run dev
```

Open `http://127.0.0.1:4000/api/freight/audit-controls/kpis` in the browser.

Other commands:

```cmd
npm start
npm test
```

**Requirements:** Node.js 20 or later. The only runtime dependency is Express.js; `npm install` requires access to an approved npm registry. **No `dotenv` or `.env` is needed.** If the company controls package installation, use its approved registry.

## Structure

```text
freight-audit-express-js/
  package.json
  src/
    index.js                    # Starts the HTTP listener
    app.js                      # Configures Express /api and headers
    routes/
      freightRoutes.js          # GET /audit-controls/kpis
    controllers/
      freightController.js      # Express request/response handler
    services/
      freightService.js         # Four sample KPIs; replace later with data adapter
  tests/
    api.test.js
    freightService.test.js
```

Request flow: **client → route → controller → service → JSON response**.

## JSON response example

```json
{
  "dashboard": "freight-audit-controls",
  "source": "mock",
  "sampleData": true,
  "period": "P06",
  "generatedAt": "2026-10-28T00:00:00.000Z",
  "kpis": {
    "freightCostDelta": {
      "label": "Freight Cost Delta",
      "value": -0.06,
      "unit": "USD/case",
      "status": "on_track"
    },
    "costPerCase": {
      "label": "Cost per case",
      "value": 1.86,
      "unit": "USD/case",
      "varianceVsStandard": -0.06,
      "openItems": 1,
      "status": "on_track"
    },
    "ytdVariance": {
      "label": "YTD variance",
      "value": 2100000,
      "unit": "USD",
      "favorability": "unfavorable",
      "monthToDateChange": 340000,
      "openItems": 1,
      "status": "action"
    },
    "auditExceptions": {
      "label": "Audit exceptions",
      "value": 2685,
      "unit": "count",
      "weekOverWeekPercent": 18,
      "status": "watch"
    }
  }
}
```

`generatedAt` is simply response generation time, **not** a Power BI refresh timestamp. All values are sample data transcribed from the demo screenshot, not measured performance.

## Add the route to an existing Express backend

**Do not start a second server** if the Freight backend already has an Express application. Copy `src/routes`, `src/controllers`, and `src/services` into that codebase (adjust paths as needed) and register the route before any 404 handler:

```js
const { createFreightRouter } = require('./src/routes/freightRoutes');
app.use('/api/freight', createFreightRouter());
```

If the existing backend uses ES Modules or TypeScript, adapt the imports to the project conventions rather than mixing module systems.

## Optional CORS

The server binds to `127.0.0.1` by default (local machine only). If a browser UI on a separate local origin calls the API, configure a single approved origin or use a dev proxy.

Windows CMD:

```cmd
set CORS_ORIGIN=http://localhost:5173
npm run dev
```

PowerShell:

```powershell
$env:CORS_ORIGIN = 'http://localhost:5173'
npm run dev
```

## Later Power BI integration

When your team provides an approved Power BI semantic model, replace the mock implementation in `src/services/freightService.js` with a Power BI adapter and preserve the JSON contract. Authentication, app authorization, user scope and RLS must be designed and reviewed before any real company data is served.

**Security:** This example is intentionally not authenticated. Do not expose it publicly or serve production data without approved security controls.
