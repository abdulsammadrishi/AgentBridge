const fs = require('fs');
const path = require('path');
const config = require('../config');

const dataPath = path.join(config.dataDir, 'websites.json');
function read() {
  try { return JSON.parse(fs.readFileSync(dataPath, 'utf8')); }
  catch { return { websites: [] }; }
}
function write(data) {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}
function get(id) { return read().websites.find(site => site.id === id); }
function list() { return read().websites; }
function create(site) { const data = read(); data.websites.push(site); write(data); return site; }
function replace(websites) { write({ websites }); return websites; }
function update(id, change) {
  const data = read(), index = data.websites.findIndex(site => site.id === id);
  if (index < 0) return null;
  data.websites[index] = { ...data.websites[index], ...change, updatedAt: new Date().toISOString() };
  write(data); return data.websites[index];
}
module.exports = { get, list, create, update, replace };
