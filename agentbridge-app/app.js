(() => {
  const root = document.querySelector('#app');
  const state = { website: null };
  const api = async (url, options = {}) => {
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Request failed.');
    return body;
  };
  const storeCurrent = website => { state.website = website; localStorage.setItem('agentbridge-current-site', website.id); };
  const getTemplate = id => document.querySelector(id).content.cloneNode(true);
  const host = url => { try { return new URL(url).host; } catch { return url; } };
  const risk = item => '<span class="risk ' + item.risk + '">' + item.risk.toUpperCase() + (item.requiresConfirmation ? ' · CONFIRM' : '') + '</span>';

  function landing() {
    root.replaceChildren(getTemplate('#landing-template'));
    root.querySelector('[data-action="start"]').addEventListener('click', () => register());
  }
  function register(prefillUrl = '', freshOnboarding = false) {
    root.replaceChildren(getTemplate('#register-template'));
    root.querySelector('[name="url"]').value = prefillUrl;
    if (freshOnboarding) {
      const form = root.querySelector('#website-form'), businessName = form.elements.businessName, businessType = form.elements.businessType;
      const clearFreshFields = () => { businessName.value = ''; businessType.value = ''; };
      form.autocomplete = 'off'; businessName.autocomplete = 'off'; clearFreshFields(); requestAnimationFrame(clearFreshFields);
    }
    root.querySelector('#website-form').addEventListener('submit', async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget), error = root.querySelector('#form-error');
      try {
        const website = await api('/api/websites', { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) });
        storeCurrent(website); verify();
      } catch (err) { error.textContent = err.message; }
    });
  }
  function verify() {
    root.replaceChildren(getTemplate('#verify-template'));
    const website = state.website;
    root.querySelector('[data-site-host]').textContent = host(website.url);
    const tag = '<meta name="agentbridge-verification" content="' + website.verificationToken + '">';
    root.querySelector('#verification-tag').textContent = tag;
    root.querySelector('[data-action="copy-token"]').addEventListener('click', async event => { await navigator.clipboard?.writeText(tag); event.currentTarget.textContent = 'Copied'; });
    root.querySelector('[data-action="back-register"]').addEventListener('click', () => register());
    root.querySelector('[data-action="verify"]').addEventListener('click', async event => {
      const error = root.querySelector('#verify-error'); event.currentTarget.disabled = true; event.currentTarget.textContent = 'Checking…';
      try {
        const result = await api('/api/websites/' + website.id + '/verify', { method: 'POST' });
        storeCurrent(result.website);
        if (result.verified) dashboard(); else { error.textContent = 'Website not verified. Add the exact meta tag, save, and try again.'; event.currentTarget.disabled = false; event.currentTarget.innerHTML = 'Check verification <b>→</b>'; }
      } catch (err) { error.textContent = err.message; event.currentTarget.disabled = false; event.currentTarget.innerHTML = 'Check verification <b>→</b>'; }
    });
  }
  function dashboard() {
    const site = state.website, capabilities = site.capabilities || [], enabled = capabilities.filter(item => item.executionReadiness === 'adapter_available' && site.tools[item.suggestedToolName]?.enabled).length;
    root.innerHTML = '<section class="dashboard"><div class="site-title"><div><p class="eyebrow">Merchant workspace</p><h1>' + escapeHtml(site.businessName) + '</h1><p>' + escapeHtml(site.url) + '</p></div><span class="verified">' + (site.verified ? '✓ VERIFIED' : 'UNVERIFIED') + '</span></div><section class="access-card ' + (site.agentAccessEnabled ? '' : 'off') + '"><div><h2>Agent Access <span class="access-status">' + (site.agentAccessEnabled ? 'ON' : 'OFF') + '</span></h2><p>' + (site.agentAccessEnabled ? 'AI agents can interact with approved capabilities.' : 'AI agents cannot interact with this website.') + '</p></div><button class="danger" data-action="toggle-access">' + (site.agentAccessEnabled ? 'TURN OFF AGENT ACCESS' : 'TURN ON AGENT ACCESS') + '</button></section><div class="dashboard-grid"><section class="dash-card"><h2>Website readiness</h2><p>' + (capabilities.length ? 'Your website is agent-ready. Review the controls below.' : 'Run the deterministic demo-site adapter to inspect capabilities.') + '</p><div class="stats"><div class="stat"><strong>' + capabilities.length + '</strong><span>DETECTED</span></div><div class="stat"><strong>' + enabled + '</strong><span>APPROVED</span></div><div class="stat"><strong>' + Math.max(capabilities.length - enabled, 0) + '</strong><span>DISABLED</span></div></div><div class="actions"><button class="small-button dark" data-action="analyze">Analyze Website</button><button class="small-button" data-action="permissions">Manage Permissions</button></div></section><section class="agent-ready"><p class="eyebrow">AgentBridge status</p><h2>' + (site.verified && site.agentAccessEnabled ? 'Your website is agent-ready.' : 'Action needed.') + '</h2><p>' + (site.verified ? 'Merchant controls are active and ready for the AgentBridge extension.' : 'Verify website ownership to continue.') + '</p></section><section class="dash-card permissions-card"><p class="eyebrow">Detected capabilities</p><h2>Merchant approvals</h2><p>Only approved capabilities can be exposed when Agent Access is on.</p><ul class="capability-list">' + capabilityMarkup(site) + '</ul><p class="empty" ' + (capabilities.length ? 'hidden' : '') + '>No capabilities have been analyzed yet.</p></section><section class="dash-card"><p class="eyebrow">Activity</p><h2>Agent Activity</h2><ul class="activity-list">' + activityMarkup(site.activity || []) + '</ul></section></div>' + document.querySelector('#extension-template').innerHTML + '</section>';
    root.querySelector('.dashboard-grid .dash-card > p').textContent = capabilities.length ? 'HTML signals detected. Review the evidence and execution readiness below.' : 'Analyze this page to inspect deterministic HTML signals.';
    root.querySelector('.permissions-card > p').textContent = 'Approval stores merchant intent. Configuration-required capabilities stay inactive until a developer provides an adapter.';
    const adapterCapabilities = (site.adapterStates || []).filter(item => item.adapter), adaptersReady = adapterCapabilities.length > 0 && adapterCapabilities.every(item => item.status === 'configured'), permissionsReady = adapterCapabilities.length > 0 && adapterCapabilities.every(item => site.tools[item.tool]?.enabled), agentReady = site.verified && capabilities.length > 0 && adaptersReady && permissionsReady && site.agentAccessEnabled;
    root.querySelector('.access-card').insertAdjacentHTML('afterend', '<section class="journey-card ' + (agentReady ? 'ready' : 'not-ready') + '"><div><p class="eyebrow">AgentBridge readiness</p><h2>' + (agentReady ? '✓ Your website is Agent Ready' : site.agentAccessEnabled ? 'Finish setup to become Agent Ready' : '🔴 Agent Access Disabled') + '</h2><p>' + (agentReady ? 'Approved capabilities are now available to WebMCP-compatible AI agents.' : site.agentAccessEnabled ? 'Complete the highlighted setup steps. Detected tools remain inactive until their adapter and permission are ready.' : 'AI agents cannot access this website’s tools.') + '</p></div><ol class="journey-list"><li class="' + (site.id ? 'done' : '') + '">Register website</li><li class="' + (site.verified ? 'done' : '') + '">Verify ownership</li><li class="' + (capabilities.length ? 'done' : '') + '">Analyze capabilities</li><li class="' + (adaptersReady ? 'done' : '') + '">Configure adapters</li><li class="' + (permissionsReady ? 'done' : '') + '">Approve permissions</li><li class="' + (site.agentAccessEnabled ? 'done' : '') + '">Enable Agent Access</li></ol></section>');
    root.querySelector('[data-action="toggle-access"]').addEventListener('click', () => changeAccess(!site.agentAccessEnabled));
    root.querySelector('[data-action="analyze"]').addEventListener('click', analyze);
    root.querySelector('[data-action="permissions"]').addEventListener('click', () => root.querySelector('.permissions-card').scrollIntoView({ behavior: 'smooth' }));
    root.querySelectorAll('[data-capability]').forEach(input => input.addEventListener('change', event => changePermission(event.target.dataset.capability, event.target.checked)));
    root.querySelectorAll('[data-configure]').forEach(button => button.addEventListener('click', () => configureAdapter(button.dataset.configure)));
    root.querySelectorAll('[data-test-adapter]').forEach(button => button.addEventListener('click', () => testAdapter(button.dataset.testAdapter)));
  }
  function capabilityMarkup(site) {
    return (site.capabilities || []).map(item => {
      const setting = site.tools[item.suggestedToolName] || { enabled: false };
      const adapterState = (site.adapterStates || []).find(state => state.capabilityId === item.id), configured = adapterState?.status === 'configured';
      const readiness = configured ? 'CONFIGURED' : item.executionReadiness === 'adapter_available' ? 'READY THROUGH AGENTBRIDGE ADAPTER' : item.executionReadiness === 'configuration_required' ? 'CONFIGURATION REQUIRED' : 'UNSUPPORTED';
      const evidence = (item.evidence || []).map(escapeHtml).join(' · ');
      const controls = adapterState?.adapter?.requiresConfig ? (configured ? '<button class="adapter-button" data-test-adapter="' + item.id + '">Test adapter</button>' : '<button class="adapter-button" data-configure="' + item.id + '">Configure adapter</button>') : '';
      const lifecycle = '✓ Detected → ' + (adapterState?.adapter ? '✓ Adapter available → ' : '⚠ No adapter → ') + (configured ? '✓ Configured → ' : '⚠ Configuration required → ') + (setting.enabled ? '✓ Approved → ' : '○ Not approved → ') + (configured && setting.enabled && site.agentAccessEnabled ? '✓ Active' : '○ Inactive');
      return '<li><div><b>' + escapeHtml(item.name) + ' ' + risk(item) + ' <span class="readiness ' + (configured ? 'adapter_available' : item.executionReadiness) + '">' + readiness + '</span></b><small>' + escapeHtml(item.category || 'READ') + ' · ' + Math.round((item.confidence || 0) * 100) + '% confidence · WebMCP: ' + escapeHtml(item.suggestedToolName) + '()</small><small class="lifecycle">' + lifecycle + '</small><small>Evidence: ' + evidence + '</small>' + controls + '</div><label class="toggle"><input type="checkbox" data-capability="' + item.id + '" ' + (setting.enabled ? 'checked' : '') + '><i></i></label></li>';
    }).join('');
  }
  function activityMarkup(activity) {
    if (!activity.length) return '<li class="empty">No activity yet. Policy and verification events will appear here.</li>';
    return activity.slice().reverse().map(entry => '<li><time>' + new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</time><span>' + escapeHtml(entry.label) + (entry.adapter ? ' · ' + escapeHtml(entry.adapter) : '') + '</span><b class="outcome ' + entry.outcome + '">' + (entry.requiresConfirmation ? '⚠ Confirmation required' : entry.outcome === 'allowed' ? '✓ Allowed' : entry.outcome === 'denied' ? '× Denied' : '• Pending') + '</b></li>').join('');
  }
  async function analyze() {
    const button = root.querySelector('[data-action="analyze"]'); button.disabled = true; button.textContent = 'Analyzing…';
    try { const result = await api('/api/websites/' + state.website.id + '/analyze', { method: 'POST' }); storeCurrent(result.website); dashboard(); }
    catch (err) { alert(err.message); button.disabled = false; button.textContent = 'Analyze Website'; }
  }
  async function changeAccess(enabled) { try { storeCurrent(await api('/api/websites/' + state.website.id + '/access', { method: 'PATCH', body: JSON.stringify({ agentAccessEnabled: enabled }) })); dashboard(); } catch (err) { alert(err.message); } }
  async function changePermission(id, enabled) { try { storeCurrent(await api('/api/websites/' + state.website.id + '/capabilities/' + id, { method: 'PATCH', body: JSON.stringify({ enabled }) })); dashboard(); } catch (err) { alert(err.message); } }
  async function configureAdapter(capabilityId) { const capability = state.website.capabilities.find(item => item.id === capabilityId), adapter = (state.website.adapterStates || []).find(item => item.capabilityId === capabilityId); if (!capability || !adapter?.adapter) return; const sample = capability.suggestedToolName === 'get_opening_hours' ? 'Monday: 9:00 AM - 5:00 PM' : capability.suggestedToolName === 'get_menu' ? 'Seasonal salad, Ember chicken, Olive cake' : capability.suggestedToolName === 'get_services' ? 'Brand strategy, Web design, Product design' : 'name, email, message'; const value = prompt('Review the detected data for ' + capability.name + '. Enter comma-separated values, or Day: hours for opening hours.', sample); if (value === null) return; const config = capability.suggestedToolName === 'get_opening_hours' ? { hours: Object.fromEntries(value.split(',').map(item => item.split(':')).filter(parts => parts.length >= 2).map(parts => [parts.shift().trim(), parts.join(':').trim()])) } : capability.suggestedToolName === 'get_menu' ? { items: value.split(',').map(item => item.trim()).filter(Boolean) } : capability.suggestedToolName === 'get_services' ? { services: value.split(',').map(item => item.trim()).filter(Boolean) } : { fields: value.split(',').map(item => item.trim()).filter(Boolean) }; try { const result = await api('/api/websites/' + state.website.id + '/capabilities/' + capabilityId + '/adapter', { method: 'PUT', body: JSON.stringify({ adapterId: adapter.adapter.id, config }) }); storeCurrent(result.website); dashboard(); } catch (err) { alert(err.message); } }
  async function testAdapter(capabilityId) { try { const result = await api('/api/websites/' + state.website.id + '/capabilities/' + capabilityId + '/adapter/test', { method: 'POST' }); storeCurrent(result.website); alert('Adapter test passed: ' + JSON.stringify(result.result)); dashboard(); } catch (err) { alert(err.message); } }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
  async function boot() {
    const params = new URLSearchParams(location.search), onboardingUrl = params.get('onboardUrl');
    const normalizeOnboardingUrl = value => {
      try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol');
        return url.origin;
      } catch { return ''; }
    };
    if (params.get('freshOnboarding') === '1') {
      history.replaceState(null, '', location.pathname);
      return register(normalizeOnboardingUrl(onboardingUrl), true);
    }
    if (onboardingUrl) {
      const normalized = normalizeOnboardingUrl(onboardingUrl);
      history.replaceState(null, '', location.pathname);
      if (normalized) return register(normalized);
    }
    const id = localStorage.getItem('agentbridge-current-site');
    if (!id) return landing();
    try { storeCurrent(await api('/api/websites/' + id)); state.website.verified ? dashboard() : verify(); }
    catch { localStorage.removeItem('agentbridge-current-site'); landing(); }
  }
  boot();
})();
