const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { analyzeWebsite } = require('../services/analyzer');
const root = path.join(__dirname, '..', '..');
function serve(port, file) { return new Promise(resolve => { const server = http.createServer((_req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(fs.readFileSync(path.join(root, file))); }).listen(port, '127.0.0.1', () => resolve(server)); }); }
function byName(result, name) { return result.capabilities.find(item => item.suggestedToolName === name); }
(async () => {
  const demo = await serve(8080, 'demo-site/index.html'), fixture = await serve(8091, 'test-sites/restaurant/index.html'), service = await serve(8092, 'test-sites/services/index.html');
  try {
    await assert.rejects(() => analyzeWebsite('file:///tmp/example.html'), /Only plain http\(s\) website URLs are supported/);
    const demoResult = await analyzeWebsite('http://127.0.0.1:8080');
    ['search_products', 'get_product', 'check_inventory', 'add_to_cart'].forEach(name => assert.equal(byName(demoResult, name).executionReadiness, 'adapter_available'));
    const restaurant = await analyzeWebsite('http://127.0.0.1:8091');
    ['get_menu', 'get_opening_hours'].forEach(name => assert(byName(restaurant, name), 'missing restaurant capability ' + name));
    assert.equal(byName(restaurant, 'get_menu').executionReadiness, 'configuration_required');
    const services = await analyzeWebsite('http://127.0.0.1:8092');
    ['get_services', 'check_availability', 'request_quote'].forEach(name => assert(byName(services, name), 'missing service capability ' + name));
    console.log('Analyzer fixtures passed: demo adapter, restaurant signals, service signals.');
  } finally { demo.close(); fixture.close(); service.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
