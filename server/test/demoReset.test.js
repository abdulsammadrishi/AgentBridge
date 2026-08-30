const assert = require('assert');
const store = require('../services/store');
const { resetDemo } = require('../services/demoReset');
const before = store.list();
try { store.replace([{ id: 'temporary-demo-site' }]); assert.equal(store.list().length, 1); assert.equal(resetDemo().reset, true); assert.equal(store.list().length, 0); console.log('Demo reset test passed.'); }
finally { store.replace(before); }
