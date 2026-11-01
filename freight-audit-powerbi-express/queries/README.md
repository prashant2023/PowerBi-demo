# Approved DAX files (provided/reviewed by the Power BI owner)

No executable live DAX is included: the screenshots provide report-mapping expressions and `PrototypeQuery` JSON rather than the **complete validated DAX** and expected output aliases.

For `DATA_SOURCE=powerbi`, request two reviewed DAX queries from the client, store them as `approved-kpis.dax` and `approved-records.dax`, and set `POWERBI_QUERIES_REVIEWED=true` only after that review. Do not accept DAX text from frontend requests.

## Output schema for `approved-kpis.dax`
One row with these aliases (Power BI may return them as `[afc]` etc.):
`afc`, `sfc`, `delta`, `totalLoads`, `totalPOs`, `totalCases`, `totalSpend`, `lastRefreshDate`.

## Output schema for `approved-records.dax`
One table with one row per audit record. Alias these columns exactly as the documented JSON fields:
`id`, `division`, `account`, `loadId`, `poNumber`, `shipMethod`, `vendorId`, `vendorName`, `item`, `priceCategory`, `freightCategory`, `receivedDate`, `miles`, `pallets`, `cases`, `weight`, `cube`, `utilizationPercent`, `sfc`, `afc`, `delta`, `freightCost`, `standardCost`, `variance`, `impact`, `margin`, `status`, `newLaneFlag`, `mbmLinehaul`, `contracted3PLLinehaul`, `vendorDelivery`, `cust3PLLinehaul`, plus the surcharge names defined in `src/powerbi/mapper.js`.

## Filter placeholders
The code supports optional, **reviewed** placeholders in DAX:
`{{STARTDATE}}`, `{{ENDDATE}}`, `{{DIVISION}}`, `{{VENDOR}}`, `{{ACCOUNT}}`, `{{LOADNUMBER}}`, `{{PONUMBER}}`, `{{ITEM}}`, `{{SHIPMETHOD}}`, `{{PRICECATEGORY}}`, `{{FREIGHTCATEGORY}}`, `{{NEWLANEFLAG}}`.

A placeholder expands to a DAX string literal (for example `"Carolina"`) or `BLANK()` if absent. The BI owner must decide *how each placeholder is used inside a query* to preserve correct filter semantics. Example **illustration of template syntax only, not a working or approved query**:

```dax
-- Inside an approved EVALUATE query body, not stand-alone:
-- FILTER('Division', ISBLANK({{DIVISION}}) || 'Division'[Division Name] = {{DIVISION}})
```

If a caller provides a filter not represented in the DAX template, the backend rejects it with 422 rather than silently ignoring it. The demo enforces `POWERBI_ALLOWED_DIVISIONS` and a required `division` filter. This is a **temporary demo safeguard, not a substitute for portal identity and RLS**.

The records adapter currently applies a secondary in-memory filter and pagination to up to 4,999 returned DAX rows. This is POC-only; production needs approved server-side DAX paging/count logic. Power BI Execute Queries has strict result-size and request limits.
