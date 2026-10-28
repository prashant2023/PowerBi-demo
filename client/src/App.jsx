import { useCallback, useEffect, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3,
  CalendarDays, Check, ChevronDown, CircleHelp, Database,
  ExternalLink, FileCode2, LayoutDashboard, Menu, RefreshCw,
  Server, ShieldCheck, TrendingUp, X, Zap
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const metricDefinitions = [
  { key: 'afc', name: 'AFC', tag: 'KPI 01', color: '#5578ee', tint: '#eef2ff', symbol: 'A' },
  { key: 'sfc', name: 'SFC', tag: 'KPI 02', color: '#10a589', tint: '#e6f8f3', symbol: 'S' },
  { key: 'loads', name: 'Loads', tag: 'KPI 03', color: '#ef9e47', tint: '#fff3e6', symbol: 'L' },
  { key: 'cases', name: 'Cases', tag: 'KPI 04', color: '#a27bdb', tint: '#f4eeff', symbol: 'C' }
];
const periods = [{ value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' }, { value: '90d', label: 'Last 90 days' }];
const count = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
function friendlyDate(value) { return dateFormat.format(new Date(`${value}T00:00:00Z`)); }

function Logo() {
  return <div className="brand">
    <div className="brand-mark"><BarChart3 size={21} strokeWidth={2.8} /></div>
    <div><strong>flowboard<span className="brand-dot">.</span></strong><small>OPERATIONS INTELLIGENCE</small></div>
  </div>;
}

function Sidebar({ active, setActive, mobileOpen, setMobileOpen }) {
  const navigate = (page) => { setActive(page); setMobileOpen(false); };
  return <>
    {mobileOpen && <button className="scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <Logo />
      <div className="workspace-label">WORKSPACE</div>
      <div className="nav-links">
        <button type="button" className={`nav-item ${active === 'overview' ? 'nav-active' : ''}`} onClick={() => navigate('overview')}><LayoutDashboard size={19} /> Overview {active === 'overview' && <span className="active-marker" />}</button>
        <button type="button" className={`nav-item ${active === 'integration' ? 'nav-active' : ''}`} onClick={() => navigate('integration')}><Database size={19} /> Power BI integration {active === 'integration' && <span className="active-marker" />}</button>
      </div>
      <div className="sidebar-bottom">
        <div className="sidebar-glow"><Zap size={19} /><div><strong>Built for clarity</strong><span>A single view for your operations metrics.</span></div></div>
        <div className="side-footer"><span className="side-avatar">FD</span><div><strong>Frontend demo</strong><span>React + Node.js</span></div><span className="footer-dot" /></div>
      </div>
    </aside>
  </>;
}

function SourceBadge({ source, connected }) {
  const text = source === 'powerbi' ? (connected ? 'POWER BI CONNECTED' : 'POWER BI MODE') : source === 'mock' ? 'DEMO DATA' : 'CHECKING SOURCE';
  return <span className={`source-badge ${connected ? 'source-live' : ''}`}><span className="status-dot" />{text}</span>;
}

function MetricCard({ definition, metric, loading }) {
  const change = metric?.change;
  const positive = change !== null && change >= 0;
  return <div className="metric-card">
    <div className="metric-top"><span className="metric-icon" style={{ background: definition.tint, color: definition.color }}>{definition.symbol}</span><span className="metric-index">{definition.tag}</span></div>
    <p className="metric-label">{definition.name}</p>
    {loading ? <div className="skeleton skeleton-number" /> : <strong className="metric-value">{metric ? count.format(metric.value) : '—'}</strong>}
    <div className="metric-foot">
      {loading ? <div className="skeleton skeleton-small" /> : change === null || change === undefined
        ? <span className="delta delta-neutral">No comparison</span>
        : <span className={`delta ${positive ? 'delta-positive' : 'delta-negative'}`}>{positive ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {Math.abs(change).toFixed(1)}%</span>}
      <span className="versus-label">vs. prior period</span>
    </div>
  </div>;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><b>{label}</b>{payload.map((item) => <div key={item.dataKey} className="tooltip-line"><span style={{ background: item.color }} />{item.name}: <strong>{count.format(item.value)}</strong></div>)}</div>;
}

function TrendChart({ data, loading }) {
  return <section className="panel trend-panel">
    <div className="panel-head"><div><span className="eyebrow">PERFORMANCE TRACKING</span><h2>Volume trend</h2><p>Movement across your selected date range</p></div><span className="panel-icon"><TrendingUp size={20}/></span></div>
    <div className="chart-legend"><span><i className="legend-loads" /> Loads</span><span><i className="legend-cases" /> Cases <small>(right axis)</small></span></div>
    <div className="chart-area">
      {loading || !data?.length ? <div className="chart-empty">{loading ? 'Loading trend data…' : 'No chart data available'}</div> :
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 3, left: -21, bottom: 2 }}>
            <CartesianGrid vertical={false} stroke="#edf0f6" strokeDasharray="4 5" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8b95a6' }} tickLine={false} axisLine={false} dy={10}/>
            <YAxis yAxisId="loads" tick={{ fontSize: 11, fill: '#8b95a6' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
            <YAxis yAxisId="cases" orientation="right" tick={{ fontSize: 10, fill: '#8b95a6' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#d5dcf0', strokeDasharray: '3 3' }}/>
            <Line yAxisId="loads" type="monotone" name="Loads" dataKey="loads" stroke="#5578ee" strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 3, stroke: '#fff' }}/>
            <Line yAxisId="cases" type="monotone" name="Cases" dataKey="cases" stroke="#10b39b" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 3, stroke: '#fff' }}/>
          </LineChart>
        </ResponsiveContainer>}
    </div>
  </section>;
}

function Pipeline({ source, connected }) {
  const isLive = source === 'powerbi';
  const stages = [
    { icon: <LayoutDashboard size={17}/>, name: 'React frontend', message: 'Dashboard rendered', status: 'Active' },
    { icon: <Server size={17}/>, name: 'Node.js API', message: '/api/kpis responding', status: 'Active' },
    { icon: <Database size={17}/>, name: 'Microsoft Power BI', message: connected ? 'Semantic model queried' : isLive ? 'Awaiting model data' : 'Mock adapter in use', status: connected ? 'Connected' : isLive ? 'Pending' : 'Simulated' }
  ];
  return <section className="panel pipeline-panel">
    <div className="panel-head"><div><span className="eyebrow">SYSTEM OVERVIEW</span><h2>Data pipeline</h2><p>How your KPIs reach this dashboard</p></div></div>
    <div className="pipeline-list">{stages.map((stage, index) => <div className="pipeline-stage" key={stage.name}>
      <div className="stage-rail"><div className={`stage-icon ${index === 2 && !connected ? 'stage-icon-mock' : ''}`}>{stage.icon}</div>{index < stages.length - 1 && <div className="stage-line" />}</div>
      <div className="stage-text"><strong>{stage.name}</strong><span>{stage.message}</span></div>
      <span className={`stage-status ${index === 2 && !connected ? 'stage-simulated' : ''}`}>{stage.status}</span>
    </div>)}</div>
    <div className="pipeline-note"><ShieldCheck size={18}/><p>Credentials stay on the server. The browser receives KPI JSON only.</p></div>
  </section>;
}

function RecentTable({ items, loading }) {
  return <section className="panel table-panel">
    <div className="panel-head table-head"><div><span className="eyebrow">DETAILED VIEW</span><h2>Daily KPI breakdown</h2><p>Most recent reporting dates</p></div><div className="table-count">{items?.length || 0} records</div></div>
    <div className="table-scroller"><table><thead><tr><th>REPORT DATE</th><th>AFC</th><th>SFC</th><th>LOADS</th><th>CASES</th></tr></thead>
    <tbody>{loading ? <tr><td colSpan="5" className="table-message">Loading rows…</td></tr> : !items?.length ? <tr><td colSpan="5" className="table-message">No records for this period</td></tr> : items.map((row) => <tr key={row.date}><td><span className="date-cell"><span className="date-tile"><CalendarDays size={15}/></span>{friendlyDate(row.date)} <span className="date-year">{row.date.slice(0,4)}</span></span></td><td>{count.format(row.afc)}</td><td>{count.format(row.sfc)}</td><td>{count.format(row.loads)}</td><td className="cases-cell">{count.format(row.cases)}</td></tr>)}</tbody></table></div>
  </section>;
}

function IntegrationPage({ source }) {
  return <div className="integration-content">
    <div className="integration-intro"><div className="eyebrow">DEVELOPER GUIDE</div><h2>From Power BI to KPI cards.</h2><p>The Node.js backend obtains a Microsoft Entra access token, sends a DAX query to a Power BI semantic model, and transforms the response into KPI JSON for React.</p></div>
    <div className="integration-stages">
      <div><span>01</span><Server size={24}/><h3>Start the API</h3><p>Node.js exposes <code>GET /api/kpis</code>, with 7-, 30- and 90-day timeframes.</p></div>
      <div><span>02</span><ShieldCheck size={24}/><h3>Authenticate with Entra</h3><p>A server-side service principal requests an OAuth access token for the Power BI API.</p></div>
      <div><span>03</span><Database size={24}/><h3>Execute DAX</h3><p>The Power BI Execute Queries API returns aggregated daily rows as JSON.</p></div>
    </div>
    <div className="integration-two">
      <section className="panel code-panel"><div className="panel-head"><div><span className="eyebrow">SEMANTIC MODEL</span><h2>Expected data schema</h2></div><FileCode2 size={20} color="#69778b"/></div><p>Create a table named <b>KpiDaily</b> in a Power BI semantic model with these columns:</p><pre>{'Date       AFC  SFC  Loads  Cases\n2026-10-24 296  207  482    2810\n2026-10-25 288  191  467    2706\n2026-10-26 311  215  503    2955'}</pre><p className="fine-print">Example data only. Date must be a Date column; AFC, SFC, Loads and Cases must be numeric. The backend groups source rows by day in DAX.</p></section>
      <section className="panel code-panel"><div className="panel-head"><div><span className="eyebrow">CONFIGURATION</span><h2>Connect your environment</h2></div><Database size={20} color="#69778b"/></div><ol className="setup-list"><li>Copy <code>.env.example</code> to <code>.env</code>.</li><li>Set <code>DATA_SOURCE=powerbi</code>.</li><li>Enter Entra tenant / app IDs, client secret and Power BI workspace / dataset IDs.</li><li>Enable Power BI Execute Queries API and grant model access to your service principal.</li><li>Restart <code>npm run dev</code>, then Refresh.</li></ol><div className="source-summary"><span className="status-dot"/><span>Current adapter: <b>{source === 'powerbi' ? 'Microsoft Power BI' : 'Mock data'}</b></span></div></section>
    </div>
    <a className="ibm-link" target="_blank" rel="noreferrer" href="https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/execute-queries">Microsoft Power BI Execute Queries API documentation <ExternalLink size={15}/></a>
  </div>;
}

export default function App() {
  const [active, setActive] = useState('overview');
  const [period, setPeriod] = useState('30d');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState(null);
  const [backendSource, setBackendSource] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const fetchKpis = useCallback(() => setRefreshKey((n) => n + 1), []);

  useEffect(() => {
    fetch('/api/health').then((res) => res.json()).then((health) => setBackendSource(health.source)).catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`/api/kpis?period=${encodeURIComponent(period)}`, { signal: controller.signal })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Unable to fetch KPI data');
        return json;
      })
      .then((json) => { setData(json); setLoading(false); })
      .catch((err) => { if (err.name !== 'AbortError') { setError(err.message || 'API is not reachable'); setLoading(false); } });
    return () => controller.abort();
  }, [period, refreshKey]);

  const source = data?.source || backendSource || 'unknown';
  const connected = source === 'powerbi' && !!data && !error;
  const currentPeriod = periods.find((p) => p.value === period)?.label;
  const asOf = data?.generatedAt ? new Date(data.generatedAt) : new Date();
  const latest = asOf.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const metrics = data?.metrics;
  return <div className="shell">
    <Sidebar active={active} setActive={setActive} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}/>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={23}/></button><span>Workspace</span><ArrowRight size={14}/><b>{active === 'overview' ? 'Overview' : 'Power BI integration'}</b></div><div className="topbar-right"><SourceBadge source={source} connected={connected}/><div className="user-avatar" title="Demo workspace">FD</div></div></header>
      <div className="content">
        {active === 'overview' ? <>
          <div className="heading-row"><div><div className="kicker"><span className="kicker-bar"/>YOUR COMMAND CENTER</div><h1>Operations overview<span className="heading-period">.</span></h1><p>Track what matters, all in one place. <span className="date-inline">{latest}</span></p></div><div className="heading-actions"><label className="period-select"><CalendarDays size={17}/><select aria-label="Reporting period" value={period} onChange={(e) => setPeriod(e.target.value)}>{periods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><ChevronDown size={15}/></label><button type="button" className="refresh-button" onClick={fetchKpis} disabled={loading}><RefreshCw size={17} className={loading ? 'spin' : ''}/> Refresh</button></div></div>
          {error && <div role="alert" className="error-banner"><CircleHelp size={19}/><div><strong>Could not load KPI data</strong><span>{error}</span></div><button onClick={fetchKpis}>Try again</button></div>}
          <div className="metrics-grid">{metricDefinitions.map((def) => <MetricCard definition={def} metric={metrics?.[def.key]} loading={loading} key={def.key}/>)}</div>
          <div className="main-panels"><TrendChart data={data?.trend} loading={loading}/><Pipeline source={source} connected={connected}/></div>
          <RecentTable items={data?.recent} loading={loading}/>
          <footer className="content-footer"><span><span className="tiny-dot"/> {source === 'mock' ? 'Demo environment — sample figures' : source === 'powerbi' ? 'Power BI mode — semantic model data' : 'Checking data source'}</span><span>{data ? `${data.daysWithData} of ${data.expectedDays} days with data` : currentPeriod} · Updated {asOf.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span></footer>
        </> : <IntegrationPage source={source}/>}
      </div>
    </main>
  </div>;
}
