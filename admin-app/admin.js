(() => {
  const tbody = document.querySelector('#websites');
  const status = document.querySelector('#table-status');
  const result = document.querySelector('#scanner-result');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const date = value => value ? new Date(value).toLocaleString() : '—';
  const domain = url => { try { return new URL(url).host; } catch { return url; } };
  const badge = (value, on, off) => '<span class="badge ' + (value ? 'yes' : 'no') + '">' + (value ? on : off) + '</span>';
  function showScan(scan) {
    if (!scan) return;
    result.hidden = false;
    const state = !scan.available ? 'WebMCP TESTING API UNAVAILABLE' : scan.active ? 'WebMCP ACTIVE' : 'WebMCP NOT DETECTED';
    result.innerHTML = '<strong class="' + (scan.active ? 'yes-text' : 'no-text') + '">' + state + '</strong><span>' + esc(scan.url || '') + '</span><span>' + scan.tools.length + ' tools</span><code>' + (scan.tools.length ? scan.tools.map(esc).join(', ') : 'No tools registered') + '</code>';
  }
  async function loadWebsites() {
    status.textContent = 'Loading records…';
    try {
      const response = await fetch('/api/websites', { cache: 'no-store' });
      const websites = await response.json();
      if (!response.ok) throw new Error(websites.error || 'Unable to load website records.');
      tbody.innerHTML = websites.map(site => {
        const capabilities = (site.capabilities || []).length;
        const approved = Object.values(site.tools || {}).filter(tool => tool.enabled).length;
        return '<tr><td><strong>' + esc(domain(site.url)) + '</strong><small>' + esc(site.url) + '</small></td><td>' + esc(site.businessType || '—') + '</td><td>' + badge(site.verified, 'Yes', 'No') + '</td><td>' + badge(site.agentAccessEnabled, 'ON', 'OFF') + '</td><td>' + capabilities + ' / ' + approved + '</td><td>' + date(site.createdAt) + '</td><td>' + date(site.updatedAt || site.createdAt) + '</td></tr>';
      }).join('') || '<tr><td colspan="7" class="empty">No website records.</td></tr>';
      status.textContent = websites.length + ' website record' + (websites.length === 1 ? '' : 's') + '.';
    } catch (error) { status.textContent = error.message; tbody.innerHTML = ''; }
  }
  document.querySelector('#refresh').addEventListener('click', loadWebsites);
  document.querySelector('#scanner-form').addEventListener('submit', event => {
    event.preventDefault();
    const url = document.querySelector('#scanner-url').value.trim();
    try { const target = new URL(url); if (!['http:', 'https:'].includes(target.protocol)) throw new Error('URL'); } catch { document.querySelector('#scanner-help').textContent = 'Enter a valid http(s) URL.'; return; }
    window.open(url, '_blank', 'noopener');
    document.querySelector('#scanner-help').textContent = 'Target opened. Click the AgentBridge extension in that tab and choose “Scan WebMCP Tools.”';
  });
  document.addEventListener('agentbridge:admin-scan-result', event => showScan(event.detail));
  const requestLatestScan = () => document.dispatchEvent(new CustomEvent('agentbridge:admin-scan-request'));
  window.addEventListener('focus', requestLatestScan);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) requestLatestScan(); });
  requestLatestScan();
  loadWebsites();
})();
