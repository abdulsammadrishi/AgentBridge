const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentbridge-ownership-'));
  const northstar = fs.readFileSync(path.join(__dirname, '../../demo-site/index.html'), 'utf8');
  let token = 'not-installed', child;
  const requests = [];
  const fixture = http.createServer((req, res) => {
    requests.push(req.url);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(req.url === '/store/' ? northstar.replace(/(<meta name="agentbridge-verification" content=")[^"]*/, '$1' + token) : '<html><head><title>Portal</title></head><body>Portal</body></html>');
  });
  await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
  const merchantOrigin = `http://127.0.0.1:${fixture.address().port}`;
  const probe = http.createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  async function api(route, method = 'GET', body) {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
    assert.equal(response.ok, true, await (response.ok ? Promise.resolve('') : response.text()));
    return response.json();
  }
  try {
    child = spawn(process.execPath, [path.join(__dirname, '../server.js')], { env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', PUBLIC_BASE_URL: merchantOrigin, API_BASE_URL: base, AGENTBRIDGE_DATA_DIR: dataDir, AUTO_SEED_DEMO: 'false' }, stdio: ['ignore', 'pipe', 'inherit'] });
    await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(() => { throw new Error('Test server exited before startup'); })]);
    const register = () => api('/api/websites', 'POST', { url: merchantOrigin + '/store/', businessName: 'Northstar ownership test', businessType: 'E-commerce' });
    const site = await register(), other = await register();
    assert.notEqual(site.verificationToken, other.verificationToken);
    assert.equal(site.verified, false);
    const route = '/api/websites/' + site.id;
    assert.equal((await api(route + '/verify', 'POST')).verified, false);
    token = site.verificationToken;
    const verified = await api(route + '/verify', 'POST');
    assert.equal(verified.verified, true);
    assert.equal(verified.website.id, site.id);
    assert.equal((await api('/api/websites/' + other.id)).verified, false);
    const analysis = await api(route + '/analyze', 'POST');
    assert.equal(analysis.website.url, merchantOrigin + '/store/');
    assert.equal(analysis.analysis.analyzedUrl, merchantOrigin + '/store/');
    for (const tool of ['search_products', 'get_product', 'check_inventory', 'add_to_cart']) {
      assert.equal(analysis.website.capabilities.find(cap => cap.suggestedToolName === tool)?.executionReadiness, 'adapter_available');
    }
    assert(requests.every(url => url === '/store/'), 'verification or analysis fetched the portal');
    await api(route + '/capabilities/add-to-cart', 'PATCH', { enabled: true });
    const policyUrl = '/api/runtime/policy?url=' + encodeURIComponent(site.url);
    const policy = await api(policyUrl);
    assert(policy.connected);
    assert(policy.policy.tools.add_to_cart.requiresConfirmation);
    await api(route + '/access', 'PATCH', { agentAccessEnabled: false });
    assert.deepEqual((await api(policyUrl)).policy.tools, {});
    await api(route + '/access', 'PATCH', { agentAccessEnabled: true });
    assert((await api(policyUrl)).policy.tools.search_products);
    assert((await api(route + '/activity')).activity.some(entry => entry.type === 'verification' && entry.outcome === 'allowed'));
    const config = await (await fetch(base + '/agentbridge-config.js')).text();
    assert(config.includes(base));
    console.log('Ownership flow passed: registration, failed check, dynamic token installation, successful retry, correct record/path, four tools, confirmation policy, access toggle, activity and runtime config.');
  } finally {
    if (child && child.exitCode === null) { child.kill(); await once(child, 'exit'); }
    await new Promise(resolve => fixture.close(resolve));
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
