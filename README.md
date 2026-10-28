# Power BI KPI Dashboard — React + Node.js demo

A demo project that follows the requested architecture:

```text
React page opens
  -> GET /api/kpis?period=30d
  -> Node.js / Express backend
  -> Microsoft Entra OAuth 2.0 service-principal authentication
  -> Power BI REST API: executeQueries (DAX)
  -> Read AFC / SFC / Loads / Cases from a semantic model
  -> Normalize query results and aggregate to JSON
  -> React displays KPI cards, trend charts and recent days
```

**Demo/mock mode works immediately.** Real Power BI access requires an Entra application, workspace permissions and a suitable semantic model. The app does **not** silently fall back to sample data if Power BI fails.

## Requirements

- Node.js 20 or newer and npm
- For Power BI mode: Microsoft Entra tenant, app registration with client secret, Power BI workspace + semantic model, and tenant permission to use the Execute Queries REST API

## Start locally

```bash
npm install
cp .env.example .env
npm run dev
```

In Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

Open **http://localhost:5173** for the dashboard. The API listens on **http://localhost:4000**. Vite proxies `/api` calls to the backend.

```bash
npm test         # Node.js API + adapter tests
npm run build    # Compile the React frontend
npm run start    # Run only the Express API
```

## 1. Prepare your Power BI semantic model

Create/publish a Power BI semantic model containing a table named `KpiDaily` with these columns:

| Column | Data type | Meaning |
|---|---|---|
| `Date` | Date | Date the metric was recorded |
| `AFC` | Whole/decimal number | Daily AFC count/total |
| `SFC` | Whole/decimal number | Daily SFC count/total |
| `Loads` | Whole/decimal number | Daily loads count/total |
| `Cases` | Whole/decimal number | Daily cases count/total |

Illustrative records (NOT company data):

```csv
Date,AFC,SFC,Loads,Cases
2026-10-24,296,207,482,2810
2026-10-25,288,191,467,2706
2026-10-26,311,215,503,2955
```

You can load [examples/powerbi_kpis_sample_200d.csv](examples/powerbi_kpis_sample_200d.csv) into **Power BI Desktop** using Get Data → Text/CSV, ensure the appropriate data types, and publish it as a semantic model to your workspace for a full test dataset.

The adapter groups rows by Date with DAX `SUM` and fetches the most recent **180 UTC calendar days**, allowing 90 days of current data plus 90 prior days for comparison. It accepts multiple source rows per day and aggregates them. If your model uses **measures**, has another grain, or different column names, update the query builder in `server/src/powerbi.mjs`; setting `POWERBI_TABLE` changes only the table name.

The dashboard treats the four values as additive. Confirm that this matches the business definitions of AFC/SFC before production use.

## 2. Enable Power BI API access

1. In **Microsoft Entra ID → App registrations**, create or select an app registration. Record its **Tenant ID** and **Application (client) ID**. Create a client secret, store it securely and copy its **value**.
2. In the **Power BI / Fabric admin portal**, enable **Dataset Execute Queries REST API** under Integration settings, and **Allow service principals to use Power BI APIs** (or the equivalent service-principal setting for your tenant). If policies restrict these settings to security groups, add the app's service principal to an allowed group.
3. In Power BI, grant the service principal access to the workspace holding the semantic model and make sure it has sufficient read/build access. Your admin may need to configure the Power BI workspace and app policies.
4. Confirm the model is supported. The JSON `executeQueries` endpoint does **not** support service principals for semantic models with row-level security (RLS) or SSO enabled. Use a delegated-user approach where organization policy requires user-based permissions (not implemented by this starter).
5. Find the workspace and semantic model IDs in the Power BI service URL or workspace information.

Microsoft references:
- [Power BI Execute Queries JSON REST API](https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/execute-queries)
- [Microsoft identity platform OAuth client credentials](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)

This demo uses **`executeQueries`**, which returns **JSON**, *not* the newer `executeDaxQueries` endpoint, which returns Arrow streams.

## 3. Enter `.env` values

Edit the file at the project root:

```dotenv
DATA_SOURCE=powerbi
PORT=4000
POWERBI_TENANT_ID=11111111-1111-4111-8111-111111111111
POWERBI_CLIENT_ID=22222222-2222-4222-8222-222222222222
POWERBI_CLIENT_SECRET=REPLACE_WITH_SECRET_VALUE
POWERBI_WORKSPACE_ID=33333333-3333-4333-8333-333333333333
POWERBI_DATASET_ID=44444444-4444-4444-8444-444444444444
POWERBI_TABLE=KpiDaily
```

**Replace all example GUIDs and the placeholder secret.** These are only sample shapes, not usable credentials. Keep `.env` out of source control. The browser never reads the secret. Restart the API after updates.

## What the backend does

1. `POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token` with `client_credentials` and scope `https://analysis.windows.net/powerbi/api/.default`.
2. `POST https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/datasets/{datasetId}/executeQueries` with the resulting bearer token and a DAX request.
3. Example DAX (the app additionally filters to the last 180 days):

   ```dax
   EVALUATE
   SUMMARIZECOLUMNS(
     'KpiDaily'[Date],
     "AFC", COALESCE(SUM('KpiDaily'[AFC]), 0),
     "SFC", COALESCE(SUM('KpiDaily'[SFC]), 0),
     "Loads", COALESCE(SUM('KpiDaily'[Loads]), 0),
     "Cases", COALESCE(SUM('KpiDaily'[Cases]), 0)
   )
   ORDER BY 'KpiDaily'[Date]
   ```

4. Validates/normalizes the JSON result rows; converts Power BI date-time strings to ISO UTC dates, and returns KPI totals, comparison percentages, a trend and the six newest dates.

### Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | API state and whether required environment variables are present (no secrets) |
| `GET /api/kpis?period=7d` | Seven-day KPI summary |
| `GET /api/kpis?period=30d` | Thirty-day summary (default) |
| `GET /api/kpis?period=90d` | Ninety-day summary |

A response looks like:

```json
{
  "source": "powerbi",
  "period": "7d",
  "generatedAt": "2026-10-26T10:00:00.000Z",
  "range": { "start": "2026-10-20", "end": "2026-10-26" },
  "metrics": { "afc": { "value": 2030, "change": 4.1 }, "sfc": { "value": 1442, "change": 3.3 }, "loads": { "value": 3568, "change": 4.7 }, "cases": { "value": 20024, "change": 6.0 } },
  "trend": [],
  "recent": [],
  "daysWithData": 7,
  "expectedDays": 7
}
```

This JSON is a *shape illustration*, not actual model data. Missing previous-period data gives `change: null`. Day filters and data comparison use UTC date boundaries.

## Troubleshooting

| Problem | Check |
|---|---|
| `Power BI authentication failed (HTTP 401/400)` | Tenant ID, client ID, secret **value** and Entra app policy |
| `Power BI query failed (HTTP 401/403)` | Service-principal tenant setting, workspace access, model read/build permissions, supported model configuration |
| `Power BI query failed (HTTP 400)` | DAX table/column names, model schema, numeric columns, unsupported RLS or SSO |
| Dashboard shows zeros / partial days | Dataset has enough rows for the requested dates; check `daysWithData` |
| `DATA_SOURCE` still mock | Update root `.env` and restart `npm run dev` |

## Security / production caveats

- Client-secret credentials are **server-side only**. Never copy them into client code, Vite env variables, commits or frontend requests.
- Auth and API requests use TLS and do not follow redirects. Token/error payloads are not reflected to browsers.
- This is a development demo, not production hardened. Add a login/auth layer for dashboard visitors, authorization, rate limiting, monitoring, retries/backoff, token/call caching and company policies before deployment.
- The API has per-user and response-size limits, so avoid one live query per user per refresh at scale.
- If the model contains sensitive data, only publish fields users are entitled to view.

## Project structure

```text
powerbi-kpi-demo/
├── .env.example
├── README.md
├── package.json
├── client/
│   ├── index.html
│   └── src/{App.jsx,main.jsx,styles.css}
├── server/
│   ├── src/{app.mjs,index.mjs,powerbi.mjs,data.mjs}
│   └── tests/
├── examples/{powerbi_kpis_sample_200d.csv,mock_api_response_30d.json}
└── scripts/dev.mjs
```
