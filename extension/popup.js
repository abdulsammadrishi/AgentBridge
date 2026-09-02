const app = document.querySelector('#app');
let currentTab, currentSite;
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const api = (path, options = {}) => new Promise((resolve, reject) => chrome.runtime.sendMessage({ type: 'AGENTBRIDGE_API', path, options }, response => response?.ok ? resolve(response.body) : reject(new Error(response?.error || 'Unable to contact AgentBridge.'))));
async function activeTab() { const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true }); return tab; }
async function ensureContentBridge(tab) { if (new URL(tab.url).protocol === 'https:') await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }); }
async function runtime() { try { return await chrome.tabs.sendMessage(currentTab.id, { type: 'GET_WEBMCP_STATUS' }); } catch { return { status: 'UNSUPPORTED', tools: [] }; } }
function error(message) { app.insertAdjacentHTML('beforeend', '<p class="error">' + esc(message) + '</p>'); }
const scanButton = () => '<button id="scan-webmcp">SCAN WEBMCP TOOLS</button><p class="subtle" id="scan-result"></p>';
const scanSummary = result => !result?.available ? 'WebMCP testing API unavailable.' : result.active ? 'WebMCP ACTIVE: ' + result.tools.join(', ') : 'WebMCP NOT DETECTED.';
const adminOrigins = () => new Set([new URL(AGENTBRIDGE_API_BASE).origin, 'http://localhost:3000', 'http://localhost:8080', 'http://localhost:8091', 'http://localhost:8092']);
const onboardingUrl = tabUrl => { const url = new URL(tabUrl); url.hash = ''; return url.href; };
function toolsMarkup(tools) { return Object.entries(tools || {}).map(([name, setting]) => '<li><label><input type="checkbox" data-tool="' + esc(name) + '" ' + (setting.enabled ? 'checked' : '') + '> ' + esc(name) + '</label><span class="tool-state ' + (setting.enabled ? 'allow' : 'deny') + '">' + (setting.enabled ? 'APPROVED' : 'DENIED') + '</span></li>').join(''); }
async function renderConnected(result) {
  currentSite = result.website; const webmcp = await runtime(); const active = Boolean(result.policy.agentAccessEnabled);
  const detectedTools = (currentSite.capabilities || []).length ? Object.fromEntries(currentSite.capabilities.map(item => [item.suggestedToolName, result.policy.tools[item.suggestedToolName]]).filter(([, setting]) => setting)) : result.policy.tools;
  app.innerHTML = '<div class="brand"><span>AB</span><div><strong>AgentBridge</strong><small>Merchant control valve</small></div></div><section class="website"><strong class="' + (currentSite.verified ? 'verified' : 'warning') + '">' + (currentSite.verified ? '✓ Website verified' : 'Website verification required') + '</strong><div class="subtle">' + esc(new URL(currentTab.url).host) + '</div></section>' + (currentSite.verified ? '<p class="section-label">Agent Access</p><section class="access"><span class="state ' + (active ? 'on' : 'off') + '">' + (active ? '● ON' : '● OFF') + '</span><span class="subtle">Backend policy</span></section><button id="toggle" class="' + (active ? 'off-button' : '') + '">' + (active ? 'TURN OFF AGENT ACCESS' : 'TURN ON AGENT ACCESS') + '</button><p class="section-label">Tool permissions</p><ul class="tools">' + toolsMarkup(detectedTools) + '</ul><p class="section-label">WebMCP runtime</p><section class="runtime"><span>Status</span><b class="' + (webmcp.status === 'ACTIVE' ? 'on' : 'off') + '">' + esc(webmcp.status || 'UNSUPPORTED') + '</b></section><div class="subtle">Exposed: ' + (webmcp.tools?.length ? webmcp.tools.map(esc).join(', ') : 'None') + '</div>' : '<button id="verify">VERIFY IN AGENTBRIDGE</button>');
  app.insertAdjacentHTML('beforeend', scanButton());
  document.querySelector('#toggle')?.addEventListener('click', () => changeAccess(!active));
  document.querySelectorAll('[data-tool]').forEach(input => input.addEventListener('change', event => changeTool(event.target.dataset.tool, event.target.checked)));
  document.querySelector('#verify')?.addEventListener('click', () => chrome.tabs.create({ url: AGENTBRIDGE_API_BASE }));
  document.querySelector('#scan-webmcp').addEventListener('click', scanWebMcp);
}
async function scanWebMcp() {
  const button = document.querySelector('#scan-webmcp'), output = document.querySelector('#scan-result');
  button.disabled = true; output.textContent = 'Scanning active page…';
  try {
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: currentTab.id }, world: 'MAIN', func: async () => {
      const testing = navigator.modelContextTesting, modelContext = document.modelContext;
      const discover = typeof testing?.listTools === 'function'
        ? () => testing.listTools()
        : typeof modelContext?.getTools === 'function'
          ? () => modelContext.getTools()
          : null;
      if (!discover) return { available: false, active: false, tools: [] };
      const listed = await discover();
      const tools = (Array.isArray(listed) ? listed : []).map(tool => typeof tool === 'string' ? tool : tool?.name || tool?.title || 'Unnamed tool');
      return { available: true, active: tools.length > 0, tools };
    } });
    const scan = { ...result, url: currentTab.url, scannedAt: new Date().toISOString() };
    await chrome.storage.session.set({ agentbridgeLastWebMcpScan: scan });
    const tabs = await chrome.tabs.query({});
    const adminTabs = tabs.filter(tab => { try { const url = new URL(tab.url); return adminOrigins().has(url.origin) && (url.pathname === '/admin' || url.pathname === '/admin/'); } catch { return false; } });
    adminTabs.forEach(adminTab => {
      chrome.tabs.sendMessage(adminTab.id, { type: 'ADMIN_SCAN_RESULT', result: scan }).catch(() => {});
      chrome.scripting.executeScript({ target: { tabId: adminTab.id }, world: 'MAIN', args: [scan], func: latest => document.dispatchEvent(new CustomEvent('agentbridge:admin-scan-result', { detail: latest })) }).catch(() => {});
    });
    output.textContent = scanSummary(scan);
  } catch (err) { output.textContent = 'Scan failed: ' + err.message; }
  button.disabled = false;
}
async function changeAccess(enabled) { const button = document.querySelector('#toggle'); button.disabled = true; try { await api('/api/extension/sites/' + currentSite.id + '/access', { method: 'PATCH', body: JSON.stringify({ currentUrl: currentTab.url, agentAccessEnabled: enabled }) }); await chrome.tabs.sendMessage(currentTab.id, { type: 'POLICY_UPDATED' }); await load(); } catch (e) { button.disabled = false; error(e.message); } }
async function changeTool(tool, enabled) { try { await api('/api/extension/sites/' + currentSite.id + '/tools/' + encodeURIComponent(tool), { method: 'PATCH', body: JSON.stringify({ currentUrl: currentTab.url, enabled }) }); await chrome.tabs.sendMessage(currentTab.id, { type: 'POLICY_UPDATED' }); await load(); } catch (e) { error(e.message); await load(); } }
async function ensureApiPermission() { const origin = new URL(AGENTBRIDGE_API_BASE).origin; if (origin.startsWith('http://')) return true; const pattern = origin + '/*'; if (await chrome.permissions.contains({ origins: [pattern] })) return true; app.innerHTML = '<div class="brand"><span>AB</span><strong>AgentBridge</strong></div><div class="unknown">Allow access to the configured AgentBridge demo?<button id="allow-api">ALLOW ' + esc(origin) + '</button></div>'; document.querySelector('#allow-api').addEventListener('click', async () => { if (await chrome.permissions.request({ origins: [pattern] })) load(); else error('Permission is required to connect to this deployment.'); }); return false; }
async function load() { try { if (!await ensureApiPermission()) return; currentTab = await activeTab(); if (!/^https?:/.test(currentTab.url || '')) { app.innerHTML = '<div class="unknown">AgentBridge works on website tabs.</div>'; return; } await ensureContentBridge(currentTab); const result = await api('/api/extension/site?url=' + encodeURIComponent(currentTab.url)); if (!result.website) { app.innerHTML = '<div class="brand"><span>AB</span><div><strong>AgentBridge</strong><small>Merchant control valve</small></div></div><div class="unknown">AgentBridge is not connected to this website.<button id="connect">CONNECT WEBSITE</button></div>' + scanButton(); document.querySelector('#connect').addEventListener('click', () => chrome.tabs.create({ url: AGENTBRIDGE_API_BASE + '/?freshOnboarding=1&onboardUrl=' + encodeURIComponent(onboardingUrl(currentTab.url)) })); document.querySelector('#scan-webmcp').addEventListener('click', scanWebMcp); return; } await renderConnected(result); } catch (e) { app.innerHTML = '<div class="brand"><span>AB</span><strong>AgentBridge</strong></div>'; error(e.message); } }
load();
