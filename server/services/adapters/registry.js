const demoStore = require('./demoStore');
const staticData = require('./staticData');
const formAction = require('./formAction');
const adapters = [demoStore, staticData, formAction];
function get(id) { return adapters.find(adapter => adapter.id === id); }
function available(capability) { return adapters.filter(adapter => adapter.supports.includes(capability.suggestedToolName)); }
function configured(site, capability) { return site.adapters?.[capability.id] || null; }
function status(site, capability) { const saved = configured(site, capability), adapter = saved ? get(saved.adapterId) : available(capability)[0]; if (!adapter) return { status: 'unsupported', adapter: null, config: null }; if (adapter.requiresConfig && (!saved || !adapter.validate(saved.config))) return { status: 'configuration_required', adapter, config: saved?.config || null }; return { status: 'configured', adapter, config: saved?.config || adapter.defaultConfig(capability) }; }
function activeTools(site) { if (!site.verified || !site.agentAccessEnabled || site.adminStatus === 'DEACTIVATED') return {}; const result = {}; (site.capabilities || []).forEach(capability => { const tool = site.tools?.[capability.suggestedToolName], resolved = status(site, capability); if (!tool?.enabled || !resolved.adapter || resolved.status !== 'configured') return; result[capability.suggestedToolName] = { enabled: true, status: 'active', adapter: resolved.adapter.id, risk: resolved.adapter.risk, requiresConfirmation: resolved.adapter.requiresConfirmationFor ? resolved.adapter.requiresConfirmationFor(capability.suggestedToolName) : resolved.adapter.requiresConfirmation, config: resolved.config }; }); return result; }
module.exports = { adapters, get, available, configured, status, activeTools };
