const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentbridge-seed-'));
process.env.AGENTBRIDGE_DATA_DIR = testDataDir;
process.env.AUTO_SEED_DEMO = 'true';
process.env.PUBLIC_BASE_URL = 'https://agentbridge.example';
const store = require('../services/store');
const { seedDemoIfEmpty } = require('../services/demoSeed');
try {
  const first = seedDemoIfEmpty();
  assert.deepEqual(first, { seeded: true, count: 3 });
  const websites = store.list();
  assert.equal(websites.length, 3);
  assert.equal(websites.find(site => site.id === 'demo-store').tools.add_to_cart.enabled, true);
  assert.equal(websites.find(site => site.id === 'demo-restaurant').adapters['view-menu'].adapterId, 'static-data');
  assert.equal(websites.find(site => site.id === 'demo-services').adapters['request-quote'].adapterId, 'form-action');
  assert.deepEqual(seedDemoIfEmpty(), { seeded: false });
  assert.equal(store.list().length, 3);
  console.log('Demo seed test passed: empty instance seeded and existing state preserved.');
} finally { fs.rmSync(testDataDir, { recursive: true, force: true }); }
