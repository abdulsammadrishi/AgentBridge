const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const store = require('./services/store');
const { analyzeWebsite, fetchHtml: fetchSafeHtml } = require('./services/analyzer');
const adapterRegistry = require('./services/adapters/registry');
const { resetDemo } = require('./services/demoReset');
const config = require('./config');

const port = config.port;
const appRoot = path.join(__dirname, '..', 'agentbridge-app');
const demoStoreRoot = path.join(__dirname, '..', 'demo-site');
const fixtureRoot = path.join(__dirname, '..', 'test-sites');
function json(res, status, body) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); }
function readBody(req) { return new Promise((resolve, reject) => { let body = ''; req.on('data', chunk => { body += chunk; if (body.length > 100000) reject(new Error('Request too large')); }); req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON')); } }); req.on('error', reject); }); }
// There is intentionally no multi-user auth in this competition MVP, so the
// workspace response includes its token for the verification step UI. A real
// authenticated product would only reveal this to the authorized merchant.
function publicSite(site) { return site ? { ...site, adapterStates: (site.capabilities || []).map(capability => adapterView(site, capability)) } : null; }
function siteOrigin(value) { try { const url = new URL(value); return url.origin; } catch { return null; } }
function siteHost(value) { try { return new URL(value).hostname.toLowerCase(); } catch { return null; } }
function sitePath(value) { try { const pathname = new URL(value).pathname.replace(/\/+$/, ''); return pathname || '/'; } catch { return null; } }
function matchesSiteUrl(site, currentUrl) {
  // Matching is server-side and includes both origin and registered path scope.
  // This prevents a copied id from controlling another domain or another demo
  // path hosted on the same public origin.
  if (!site || !currentUrl || siteOrigin(site.url) !== siteOrigin(currentUrl)) return false;
  const registered = sitePath(site.url), current = sitePath(currentUrl);
  return registered === '/' || current === registered || current.startsWith(registered + '/');
}
function matchingSite(currentUrl) { return store.list().filter(site => matchesSiteUrl(site, currentUrl)).sort((a, b) => sitePath(b.url).length - sitePath(a.url).length)[0]; }
function extensionSite(site) {
  if (!site) return { website: null };
  return { website: publicSite(site), policy: { agentAccessEnabled: Boolean(site.agentAccessEnabled), tools: site.tools || {} } };
}
function adapterView(site, capability) { const resolved = adapterRegistry.status(site, capability), saved = adapterRegistry.configured(site, capability); return { capabilityId: capability.id, tool: capability.suggestedToolName, status: resolved.status, adapter: resolved.adapter ? { id: resolved.adapter.id, requiresConfig: resolved.adapter.requiresConfig, requiresConfirmation: resolved.adapter.requiresConfirmation, risk: resolved.adapter.risk } : null, config: saved?.config || null, availableAdapters: adapterRegistry.available(capability).map(adapter => ({ id: adapter.id, requiresConfig: adapter.requiresConfig, requiresConfirmation: adapter.requiresConfirmation })) }; }
function validUrl(value) { try { const url = new URL(value); return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password; } catch { return false; } }
function defaultTools() { return { search_products: { enabled: true, risk: 'low' }, get_product: { enabled: true, risk: 'low' }, check_inventory: { enabled: true, risk: 'low' }, add_to_cart: { enabled: false, risk: 'medium' }, place_order: { enabled: false, risk: 'high', requiresConfirmation: true } }; }
function addActivity(site, entry) { return [...(site.activity || []), { id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...entry }].slice(-50); }
function metaMatches(html, token) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  return tags.some(tag => {
    const name = /\bname\s*=\s*["']?agentbridge-verification["']?/i.test(tag);
    const content = new RegExp('\\bcontent\\s*=\\s*["\']?' + token.replace(/[.*+?^$()|[\]\\]/g, '\\$&') + '["\']?', 'i').test(tag);
    return name && content;
  });
}
async function fetchHtml(url) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow', headers: { 'User-Agent': 'AgentBridge-Verification-MVP/1.0' } });
    const finalUrl = new URL(response.url);
    if (!response.ok || !['http:', 'https:'].includes(finalUrl.protocol)) throw new Error('The website did not return a successful HTML response.');
    return (await response.text()).slice(0, 1024 * 1024);
  } finally { clearTimeout(timer); }
}
function serveFile(res, root, requested) {
  const filePath = path.resolve(root, '.' + requested);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return false;
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
  res.writeHead(200, { 'Content-Type': (types[path.extname(filePath)] || 'application/octet-stream') + '; charset=utf-8' });
  fs.createReadStream(filePath).pipe(res); return true;
}
function serveStatic(req, res) {
  const requested = decodeURIComponent(req.url.split('?')[0]);
  if (requested === '/agentbridge-config.js') { res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' }); return res.end('window.AgentBridgeConfig=' + JSON.stringify({ apiBase: config.apiBaseUrl, publicBase: config.publicBaseUrl, webmcpOriginTrialToken: config.webmcpOriginTrialToken }) + ';if(window.AgentBridgeConfig.webmcpOriginTrialToken){const m=document.createElement("meta");m.httpEquiv="origin-trial";m.content=window.AgentBridgeConfig.webmcpOriginTrialToken;document.head.appendChild(m);}'); }
  if (requested === '/store' || requested === '/store/') return serveFile(res, demoStoreRoot, '/index.html');
  if (requested.startsWith('/store/')) return serveFile(res, demoStoreRoot, requested.slice('/store'.length));
  if (requested === '/restaurant' || requested === '/restaurant/') return serveFile(res, fixtureRoot, '/restaurant/index.html');
  if (requested === '/services' || requested === '/services/') return serveFile(res, fixtureRoot, '/services/index.html');
  if (requested === '/site.css') return serveFile(res, fixtureRoot, '/site.css');
  if (requested === '/adapter-runtime.js') return serveFile(res, fixtureRoot, '/adapter-runtime.js');
  return serveFile(res, appRoot, requested === '/' ? '/index.html' : requested);
}
const server = http.createServer(async (req, res) => {
  try {
    const origin = req.headers.origin;
    if (origin && config.corsOrigins.includes(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.writeHead(204).end();
    const parts = req.url.split('?')[0].split('/').filter(Boolean);
    const requestUrl = new URL(req.url, 'http://localhost');
    if (req.method === 'POST' && req.url === '/api/demo/reset') { if (!config.demoResetEnabled) return json(res, 403, { error: 'Demo reset is disabled in this deployment.' }); return json(res, 200, resetDemo()); }
    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'extension' && parts[2] === 'site') {
      const currentUrl = requestUrl.searchParams.get('url');
      if (!validUrl(currentUrl)) return json(res, 400, { error: 'A valid current website URL is required.' });
      return json(res, 200, extensionSite(matchingSite(currentUrl)));
    }
    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'runtime' && parts[2] === 'policy') {
      const currentUrl = requestUrl.searchParams.get('url');
      const site = matchingSite(currentUrl);
      if (!site || !site.verified) return json(res, 200, { connected: false, policy: null });
      return json(res, 200, { connected: true, website: { id: site.id, url: site.url }, policy: { agentAccessEnabled: Boolean(site.agentAccessEnabled), tools: adapterRegistry.activeTools(site) } });
    }
    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'runtime' && parts[2] === 'activity') {
      const body = await readBody(req), site = store.get(body.websiteId);
      if (!site || !matchesSiteUrl(site, body.currentUrl)) return json(res, 403, { error: 'Website does not match this runtime.' });
      const active = adapterRegistry.activeTools(site)[body.tool];
      if (!active) return json(res, 403, { error: 'This tool is not active for the website.' });
      const updated = store.update(site.id, { activity: addActivity(site, { type: 'adapter_execution', label: body.tool, adapter: active.adapter, outcome: body.result === 'ERROR' ? 'denied' : 'allowed', result: body.result || 'SUCCESS', requiresConfirmation: active.requiresConfirmation, summary: String(body.summary || '').slice(0, 180) }) });
      return json(res, 201, { activity: updated.activity.at(-1) });
    }
    if (parts[0] === 'api' && parts[1] === 'extension' && parts[2] === 'sites' && parts[3]) {
      const site = store.get(parts[3]); if (!site) return json(res, 404, { error: 'Website not found.' });
      const body = await readBody(req);
      if (!matchesSiteUrl(site, body.currentUrl)) return json(res, 403, { error: 'This tab does not match the registered website.' });
      if (req.method === 'PATCH' && parts[4] === 'access') {
        const updated = store.update(site.id, { agentAccessEnabled: Boolean(body.agentAccessEnabled), activity: addActivity(site, { type: 'access', label: body.agentAccessEnabled ? 'Agent access enabled from extension' : 'Agent access disabled from extension', outcome: body.agentAccessEnabled ? 'allowed' : 'denied' }) });
        return json(res, 200, extensionSite(updated));
      }
      if (req.method === 'PATCH' && parts[4] === 'tools' && parts[5]) {
        const tool = parts[5];
        if (!site.tools || !Object.prototype.hasOwnProperty.call(site.tools, tool)) return json(res, 404, { error: 'Tool is not configured for this website.' });
        const tools = { ...site.tools, [tool]: { ...site.tools[tool], enabled: Boolean(body.enabled) } };
        const updated = store.update(site.id, { tools, activity: addActivity(site, { type: 'permission', label: tool + ' permission changed from extension', outcome: body.enabled ? 'allowed' : 'denied' }) });
        return json(res, 200, extensionSite(updated));
      }
      return json(res, 404, { error: 'Not found.' });
    }
    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'websites' && !parts[2]) return json(res, 200, store.list().map(publicSite));
    if (req.method === 'POST' && req.url === '/api/websites') {
      const body = await readBody(req);
      if (!validUrl(body.url) || !body.businessName || !['E-commerce', 'Restaurant', 'Services', 'Other'].includes(body.businessType)) return json(res, 400, { error: 'Enter a valid http(s) website URL, business name, and business type.' });
      const site = { id: crypto.randomUUID(), url: body.url, businessName: body.businessName.trim(), businessType: body.businessType, verified: false, verificationToken: crypto.randomBytes(18).toString('hex'), agentAccessEnabled: true, tools: defaultTools(), capabilities: [], adapters: {}, activity: [], createdAt: new Date().toISOString() };
      store.create(site); return json(res, 201, publicSite(site));
    }
    if (parts[0] === 'api' && parts[1] === 'websites' && parts[2]) {
      const site = store.get(parts[2]); if (!site) return json(res, 404, { error: 'Website not found.' });
      if (req.method === 'GET' && !parts[3]) return json(res, 200, publicSite(site));
      if (req.method === 'GET' && parts[3] === 'adapters') return json(res, 200, { adapters: (site.capabilities || []).map(capability => adapterView(site, capability)) });
      if (parts[3] === 'capabilities' && parts[4] && parts[5] === 'adapter') {
        const capability = (site.capabilities || []).find(item => item.id === parts[4]); if (!capability) return json(res, 404, { error: 'Capability not detected.' });
        if (req.method === 'GET') return json(res, 200, adapterView(site, capability));
        if (req.method === 'PUT') {
          const body = await readBody(req), adapter = adapterRegistry.get(body.adapterId);
          if (!adapter || !adapterRegistry.available(capability).some(item => item.id === adapter.id)) return json(res, 400, { error: 'This adapter is not supported for the detected capability.' });
          if (adapter.requiresConfig && !adapter.validate(body.config)) return json(res, 400, { error: 'Adapter configuration is incomplete or invalid.' });
          const adapters = { ...(site.adapters || {}), [capability.id]: { adapterId: adapter.id, config: body.config || {}, configuredAt: new Date().toISOString() } };
          const updated = store.update(site.id, { adapters, activity: addActivity(site, { type: 'adapter_configuration', label: capability.name + ' adapter configured', adapter: adapter.id, outcome: 'allowed' }) });
          return json(res, 200, { website: publicSite(updated), adapter: adapterView(updated, capability) });
        }
        if (req.method === 'POST' && parts[6] === 'test') {
          const resolved = adapterRegistry.status(site, capability); if (!resolved.adapter || resolved.status !== 'configured') return json(res, 409, { error: 'Configure a supported adapter before testing.' });
          const result = resolved.adapter.execute({ tool: capability.suggestedToolName, config: resolved.config });
          const updated = store.update(site.id, { activity: addActivity(site, { type: 'adapter_test', label: capability.name + ' adapter test', adapter: resolved.adapter.id, outcome: 'allowed', result: 'SUCCESS', requiresConfirmation: resolved.adapter.requiresConfirmation, summary: 'Adapter test only; no external request sent.' }) });
          return json(res, 200, { result, website: publicSite(updated) });
        }
      }
      if (req.method === 'POST' && parts[3] === 'verify') {
        try { const { html } = await fetchSafeHtml(site.url); const verified = metaMatches(html, site.verificationToken); const updated = store.update(site.id, { verified, activity: addActivity(site, { type: 'verification', label: verified ? 'Website ownership verified' : 'Website verification failed', outcome: verified ? 'allowed' : 'denied' }) }); return json(res, 200, { verified, website: publicSite(updated), message: verified ? 'Website ownership verified.' : 'Verification tag not found yet.' }); }
        catch (error) { return json(res, 422, { error: 'Could not fetch this website. Check the URL and try again.' }); }
      }
      if (req.method === 'POST' && parts[3] === 'analyze') {
        const result = await analyzeWebsite(site.url); const tools = { ...site.tools }; result.capabilities.forEach(capability => { if (!tools[capability.suggestedToolName]) tools[capability.suggestedToolName] = { enabled: false, risk: capability.risk, requiresConfirmation: Boolean(capability.requiresConfirmation) }; }); const updated = store.update(site.id, { capabilities: result.capabilities, tools, activity: addActivity(site, { type: 'analysis', label: result.capabilities.length ? 'Capability analysis completed' : 'No deterministic capabilities found', outcome: result.capabilities.length ? 'allowed' : 'pending' }) }); return json(res, 200, { website: publicSite(updated), analysis: result }); }
      if (req.method === 'GET' && parts[3] === 'capabilities') return json(res, 200, { capabilities: site.capabilities, tools: site.tools });
      if (req.method === 'GET' && parts[3] === 'activity') return json(res, 200, { activity: site.activity || [] });
      if (req.method === 'PATCH' && parts[3] === 'access') { const body = await readBody(req); const enabled = Boolean(body.agentAccessEnabled); const updated = store.update(site.id, { agentAccessEnabled: enabled, activity: addActivity(site, { type: 'access', label: enabled ? 'Agent access enabled' : 'Agent access disabled', outcome: enabled ? 'allowed' : 'denied' }) }); return json(res, 200, publicSite(updated)); }
      if (req.method === 'PATCH' && parts[3] === 'capabilities' && parts[4]) { const body = await readBody(req), capability = site.capabilities.find(item => item.id === parts[4]); if (!capability) return json(res, 404, { error: 'Capability not detected.' }); const tool = capability.suggestedToolName; const tools = { ...site.tools, [tool]: { ...site.tools[tool], enabled: Boolean(body.enabled), risk: capability.risk, requiresConfirmation: Boolean(capability.requiresConfirmation) } }; const updated = store.update(site.id, { tools, activity: addActivity(site, { type: 'permission', label: capability.name, outcome: body.enabled ? 'allowed' : 'denied' }) }); return json(res, 200, publicSite(updated)); }
    }
    if (!serveStatic(req, res)) json(res, 404, { error: 'Not found.' });
  } catch (error) { console.error(error); json(res, 500, { error: 'Something went wrong.' }); }
});
server.listen(port, () => console.log('AgentBridge running at http://localhost:' + port));
