const store = require('./store');
function resetDemo() { store.replace([]); return { reset: true, message: 'Competition demo data reset. Re-register local fixtures to begin a fresh recording.' }; }
module.exports = { resetDemo };
