const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../../agentbridge-app/app.js'), 'utf8');
const verifySource = source.slice(source.indexOf('  function verify()'), source.indexOf('  function dashboard()'));
function setup(publicBase = '', origin = 'http://localhost:3000') {
  const elements = new Map();
  const root = { replaceChildren() {}, querySelector(selector) {
    if (!elements.has(selector)) elements.set(selector, { isConnected: true, addEventListener(_type, callback) { this.click = () => { const event = { currentTarget: this }; const result = callback(event); event.currentTarget = null; return result; }; } });
    return elements.get(selector);
  } };
  let resolve, reject, stored, dashboardShown = false;
  const request = new Promise((yes, no) => { resolve = yes; reject = no; });
  const context = { root, state: { website: { id: 'site', url: 'https://example.test/store/', verificationToken: 'dynamic-token' } }, getTemplate: () => ({}), host: value => new URL(value).host, navigator: { clipboard: { writeText: async () => {} } }, api: () => request, storeCurrent: site => { stored = site; }, dashboard: () => { dashboardShown = true; }, register() {}, AbortSignal };
  root.querySelector('#verify-error');
  const tip = root.querySelector('[data-local-demo-tip]');
  tip.remove = () => { tip.isConnected = false; };
  Object.assign(context, { URL, window: { AgentBridgeConfig: { publicBase } }, location: { origin } });
  vm.runInNewContext(verifySource + '\nverify();', context);
  return { elements, resolve, reject, stored: () => stored, dashboardShown: () => dashboardShown };
}
(async () => {
  for (const [publicBase, origin, visible] of [
    ['', 'http://localhost:3000', true],
    ['http://127.0.0.1:3000', 'http://localhost:3000', true],
    ['', 'http://[::1]:3000', true],
    ['https://agentbridge-production-dce4.up.railway.app', 'http://localhost:3000', false],
    ['', 'https://agentbridge-production-dce4.up.railway.app', false]
  ]) assert.equal(setup(publicBase, origin).elements.get('[data-local-demo-tip]').isConnected, visible);
  for (const outcome of ['failure', 'network', 'timeout', 'success', 'navigated']) {
    const test = setup(), button = test.elements.get('[data-action="verify"]'), error = test.elements.get('#verify-error');
    error.textContent = 'old error';
    const pending = button.click();
    assert.equal(button.disabled, true);
    assert.equal(button.textContent, 'Checking…');
    assert.equal(error.textContent, '');
    if (outcome === 'network') test.reject(new Error('Network unavailable'));
    else if (outcome === 'timeout') test.reject(Object.assign(new Error('Timed out'), { name: 'TimeoutError' }));
    else { if (outcome === 'navigated') button.isConnected = false; test.resolve({ verified: outcome !== 'failure', website: { id: 'site' }, message: 'Publish the matching tag and retry.' }); }
    await pending;
    assert.equal(button.disabled, false);
    assert.equal(button.innerHTML, 'Check verification <b>→</b>');
    assert.equal(test.dashboardShown(), outcome === 'success');
    if (outcome === 'failure') assert.match(error.textContent, /matching tag/);
    if (outcome === 'network') assert.match(error.textContent, /Network unavailable/);
    if (outcome === 'timeout') assert.match(error.textContent, /timed out/);
    if (outcome === 'navigated') assert.equal(test.stored(), undefined);
  }
  const copy = setup().elements.get('[data-action="copy-token"]');
  await copy.click(); assert.equal(copy.textContent, 'Copied');
  console.log('Ownership UI passed: currentTarget cleared after dispatch, disabled pending state, failed verification, network failure, timeout, success, navigation and copy.');
})().catch(error => { console.error(error); process.exitCode = 1; });
