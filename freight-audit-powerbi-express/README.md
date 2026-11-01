# Freight Audit Controls API - Express.js / CommonJS (.js)

**Backend-only** implementation of the client's *Audit Controls API: Report Definitions & Field Mapping* screenshots. No React app is included. Two client-defined routes expose an explicitly stable JSON contract in either mock or Power BI mode.

> These `GET /api/v1/audit/*` endpoints are **your Express backend routes**, not Microsoft Power BI REST endpoints. In `DATA_SOURCE=powerbi`, Express calls Microsoft Entra and the Power BI **Execute Queries** REST API behind the scenes. The client document calls these a **suggested backend API contract**; verify if the client has already deployed a separate backend API with these paths before building an extra proxy layer.

## 1. Start locally - no Power BI required

Requirements: Node.js >=20 (Node 22 recommended), npm, access to an approved npm registry.

### Windows Command Prompt

```cmd
npm install
copy .env.example .env
npm run dev
```

### Windows PowerShell

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Then browse:

- `http://127.0.0.1:4000/api/health`
- `http://127.0.0.1:4000/api/v1/audit/kpis`
- `http://127.0.0.1:4000/api/v1/audit/kpis?startDate=2026-01-01&endDate=2026-10-31&division=Carolina`
- `http://127.0.0.1:4000/api/v1/audit/records?dimension=DC&page=1&pageSize=50&division=Carolina`
- `http://127.0.0.1:4000/api/v1/audit/records?dimension=Load&sortBy=freightCost&sortDir=desc&page=1&pageSize=5`

Mock API response has `X-Data-Source: mock` and `X-Sample-Data: true` headers. The JSON contract remains consistent between modes.

`npm test` runs unit tests and Express HTTP tests after dependencies are installed. You can run the dependency-free tests separately with `node --test tests/mock.test.js tests/powerbi.test.js`.

## 2. Routes and response contracts

### `GET /api/v1/audit/kpis`

Returns the **upper KPI-card** response from the mapping document:

```json
{
  "afc": 1.86,
  "sfc": 1.92,
  "delta": -0.06,
  "totalLoads": 482,
  "totalPOs": 1480,
  "totalCases": 12000,
  "totalSpend": 1572072.00,
  "lastRefreshDate": "2026-10-30T04:00:00Z"
}
```

The JSON above is an **illustrative contract**, not an actual response or a live Power BI result. Running the mock backend returns **calculated values** from 180 deterministic synthetic rows, so the totals will differ. Matching the field names and calculation relationships is intentional; blindly copying screenshot totals would produce inconsistent filters and records.

Mock calculations:

- `afc` = sum(freightCost) / sum(cases) (weighted rate, mock approximation)
- `sfc` = sum(standardCost) / sum(cases) (weighted rate, mock approximation)
- `delta` = sum(freightCost - standardCost) / sum(cases)
- `totalLoads` = distinct `loadId` count
- `totalPOs` = count of nonempty `poNumber` (field mapping shows Count, **not necessarily DISTINCTCOUNT**)
- `totalCases` = sum of `cases` / Received Quantity
- `totalSpend` = sum of `freightCost` / Extended Freight Cost
- `lastRefreshDate` = fixed **fixture** timestamp in mock, must be model-derived in live queries

When live, **use the approved `[AFC]`, `[SFC]`, and `[Delta (AFC-SFC)]` measures directly**. Do not assume the mock approximation reproduces business measure logic.

### `GET /api/v1/audit/records`

Returns the **lower Freight Audit grid** response:

```json
{
  "totalCount": 1420,
  "page": 1,
  "pageSize": 50,
  "items": [ {"id": "LD-804821-PO-229140", "division": "Carolina", "loadId": "LD-804821", "poNumber": "PO-229140"} ]
}
```

The above is a shortened example contract; the fixture provides full detailed records, including `vendorId`, `vendorName`, `shipMethod`, `item`, `priceCategory`, `freightCategory`, `receivedDate`, `miles`, `pallets`, `cases`, `weight`, `cube`, `utilizationPercent`, `sfc`, `afc`, `delta`, `freightCost`, `standardCost`, `variance`, `impact`, `margin`, `status`, `linehaul`, and `surcharges`. See `examples/client-example-record.json` for the documented example mapped to JSON.

`dimension` accepts `DC`, `Load`, `PO`, `Vendor`, `ALL`. **The client's example for `dimension=DC` still returns flat record items**. Our implementation keeps that shape and sorts by the selected dimension by default, rather than returning a different aggregation schema. If the UI truly expects pre-aggregated rows by dimension, confirm the grouping contract with its owner first.

Pagination: `page=1` default, `pageSize=50` default, maximum `100` per request. Sorting: `sortBy=receivedDate|division|loadId|poNumber|vendorName|cases|freightCost|variance|afc|sfc` and `sortDir=asc|desc`.

### Supported filters

`startDate`, `endDate` (`YYYY-MM-DD`), `division`, `vendor`, `account`, `loadNumber`, `poNumber`, `item`, `shipMethod`, `priceCategory`, `freightCategory`, `newLaneFlag`.

All are validated; unknown parameters or malformed values produce HTTP 400. Mock filters are equality comparisons (case-insensitive for strings) and date-inclusive. The Power BI query template must explicitly implement any filters accepted in **live** mode; the adapter fails with 422 rather than ignoring a requested filter.

## 3. How files connect

```text
src/index.js                   Loads .env, validates config, starts Express
src/app.js                     Mounts GET routes + centralized errors
src/routes/auditRoutes.js      /api/v1/audit/kpis and /api/v1/audit/records
src/controllers/auditController.js
src/utils/filters.js           Filter validation, local sorting and paging
src/services/mockAuditService.js
src/mock/records.js            180 repeatable synthetic records
src/services/powerbiAuditService.js
src/powerbi/auth.js            MSAL ConfidentialClientApplication + token cache
src/powerbi/client.js          POST .../groups/:workspaceId/datasets/:id/executeQueries
src/powerbi/queries.js         Loads reviewed DAX, validates template placeholders
src/powerbi/mapper.js          Maps Power BI rows to the documented JSON contract
src/middleware/portalAuth.js   DEMO-only shared bearer token gate for LIVE mode
queries/README.md              Reviewed DAX / filter instructions
```

## 4. Connect Power BI when client credentials arrive

The supplied screenshots show the tenant, workspace, semantic-model and report identifiers but **not a usable `ENTRA_CLIENT_ID` nor an `ENTRA_CLIENT_SECRET`**, and do not provide the complete *BI-owner-approved* DAX needed for these two endpoints. Do not use the displayed identifiers as verified production configuration without confirming with the owner.

Prerequisites to request from the client:

1. Authorized Entra backend app **client ID** and approved credential method. Do **not** send the secret in Teams, Git or chat; provision it through an approved secret manager.
2. Tenant and workspace/model identifier confirmation, tenant settings and application Read/Build access.
3. **RLS / SSO confirmation**. Microsoft states the JSON Execute Queries endpoint does not support service principals for RLS/SSO semantic models. If RLS is enabled, the integration **must change** to a security-approved delegated-user or embedding approach; do not simply supply `impersonatedUserName`.
4. Exact **reviewed, versioned DAX** for the KPI output and record output, including mapping aliases and controlled filters. `PrototypeQuery` JSON in the mapping doc is not executable DAX.
5. Agreement on pagination for large record sets, PO count versus distinct count, and scope/identity authorization.
6. Backend HTTPS outbound egress to `login.microsoftonline.com` and `api.powerbi.com` through an approved private/corporate network route.

Example (do not commit `.env`; IDs below intentionally remain blank):

```dotenv
PORT=4000
HOST=127.0.0.1
DATA_SOURCE=powerbi
POWERBI_AUTH_METHOD=client_secret
ENTRA_TENANT_ID=<approved tenant ID>
ENTRA_CLIENT_ID=<approved client ID>
ENTRA_CLIENT_SECRET=<secret from approved vault>
POWERBI_WORKSPACE_ID=<approved workspace ID>
POWERBI_DATASET_ID=<approved semantic model ID>
POWERBI_KPI_QUERY_FILE=queries/approved-kpis.dax
POWERBI_RECORDS_QUERY_FILE=queries/approved-records.dax
POWERBI_QUERIES_REVIEWED=true
POWERBI_MODEL_RLS=disabled-confirmed
POWERBI_ALLOWED_DIVISIONS=Carolina
PORTAL_API_TOKEN=<random 24+ character internal dev-only token>
```

The backend **fails closed** if required configuration is absent, RLS is not confirmed disabled, or reviewed DAX is missing. The DAX files are deliberately not populated because the correct data measures/joins/query semantics must be reviewed by the BI owner. See `queries/README.md`.

In live DEMO mode, call `GET /api/v1/audit/kpis?division=Carolina` with `Authorization: Bearer <PORTAL_API_TOKEN>` from an approved HTTP client. This shared bearer token is **only a temporary controlled development gate**, not real McLane portal login, role checking, tenant-user authorization, or row-level security. It is not appropriate for multi-user production. Use the enterprise portal's verified session/JWT and row-scope enforcement before exposing real data.

The POC currently uses bounded in-memory pagination for up to 4,999 records, and limits page sizes to 100; **production must implement reviewed DAX server-side pagination/count and query result-limits** to avoid truncated data and excess resource consumption.

## 5. Power BI API versus client-designed API

- Your public Express route is `GET /api/v1/audit/kpis` or `GET /api/v1/audit/records`.
- Backend internal Microsoft endpoint is `POST https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/datasets/{datasetId}/executeQueries` with one DAX query per request.
- Authentication uses `@azure/msal-node` app-only token with `https://analysis.windows.net/powerbi/api/.default` scope. The `clientId` missing in the screenshots is the Entra **Application (client) ID**, not the tenant/workspace/dataset/report ID.

Microsoft references:
- https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/execute-queries-in-group
- https://learn.microsoft.com/en-us/entra/msal/javascript/node/acquire-token-requests

## 6. Known deliberate limitations

- No live Power BI connection has been tested. Microsoft/Entra credentials and client-approved DAX were not supplied.
- Sample dataset and KPI figures are synthetic. The included real-looking row is copied from the **client's illustrative field-mapping example**, not live data.
- Audit Controls dashboard also shows `Cost per Case`, `YTD Variance`, `Audit Exceptions` and status badges. Those are **not part of the `/api/v1/audit/kpis` sample contract** in the mapping screenshots. Their complete measure definitions/thresholds need BI/product confirmation; don't present invented calculations as business-approved values.
- Grouping and sorting behavior in the client's proposal should be confirmed with frontend owners before treating it as production contract.
- In live mode the adapter assumes approved DAX returns the requested authorized rows and aliases; its local filter is defense-in-depth, not an entitlement engine.

This backend is suitable for local mock development and as a reviewed integration scaffold, **not production authorization as-is**.
