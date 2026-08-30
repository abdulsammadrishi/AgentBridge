const store = require('./store');
const config = require('../config');

function capability(id, name, category, risk, suggestedToolName, executionReadiness, evidence, confidence = 0.99) { return { id, name, category, risk, suggestedToolName, confidence, status: 'detected', executionReadiness, evidence }; }
function tools(entries) { return Object.fromEntries(entries.map(([name, enabled, risk, requiresConfirmation = false]) => [name, { enabled, risk, requiresConfirmation }])); }
function demoSites() {
  const base = config.publicBaseUrl || config.apiBaseUrl;
  return [
    { id: 'demo-store', url: base + '/store/', businessName: 'Northstar Supply', businessType: 'E-commerce', verified: true, verificationToken: 'demo-store-verification-token', agentAccessEnabled: true, capabilities: [capability('search-products', 'Search products', 'READ', 'low', 'search_products', 'adapter_available', ['Known AgentBridge demo-store adapter']), capability('get-product', 'Product details', 'READ', 'low', 'get_product', 'adapter_available', ['Known AgentBridge demo-store adapter']), capability('check-inventory', 'Check inventory', 'READ', 'low', 'check_inventory', 'adapter_available', ['Known AgentBridge demo-store adapter']), capability('add-to-cart', 'Add to cart', 'ACTION', 'medium', 'add_to_cart', 'adapter_available', ['Known AgentBridge demo-store adapter'])], tools: tools([['search_products', true, 'low'], ['get_product', true, 'low'], ['check_inventory', true, 'low'], ['add_to_cart', true, 'medium', true]]), adapters: {}, activity: [], createdAt: new Date().toISOString() },
    { id: 'demo-restaurant', url: base + '/restaurant/', businessName: 'Olive & Ember', businessType: 'Restaurant', verified: true, verificationToken: 'demo-restaurant-verification-token', agentAccessEnabled: true, capabilities: [capability('view-menu', 'View menu', 'READ', 'low', 'get_menu', 'configuration_required', ['Restaurant menu fixture detected'], 0.9), capability('restaurant-hours', 'Check opening hours', 'READ', 'low', 'get_opening_hours', 'configuration_required', ['Restaurant hours fixture detected'], 0.87)], tools: tools([['get_menu', true, 'low'], ['get_opening_hours', true, 'low']]), adapters: { 'view-menu': { adapterId: 'static-data', config: { items: ['Charred aubergine (vegetarian)', 'Herb lemon chicken', 'Olive oil cake (vegetarian)'] }, configuredAt: new Date().toISOString() }, 'restaurant-hours': { adapterId: 'static-data', config: { hours: { 'Monday – Saturday': '11:00 AM - 10:00 PM', Sunday: 'Closed' } }, configuredAt: new Date().toISOString() } }, activity: [], createdAt: new Date().toISOString() },
    { id: 'demo-services', url: base + '/services/', businessName: 'Clearline Studio', businessType: 'Services', verified: true, verificationToken: 'demo-services-verification-token', agentAccessEnabled: true, capabilities: [capability('view-services', 'View services', 'READ', 'low', 'get_services', 'configuration_required', ['Services fixture detected'], 0.8), capability('request-quote', 'Contact / request quote', 'ACTION', 'medium', 'request_quote', 'configuration_required', ['Request-quote fixture detected'], 0.82)], tools: tools([['get_services', true, 'low'], ['request_quote', true, 'medium', true]]), adapters: { 'view-services': { adapterId: 'static-data', config: { services: ['Brand strategy', 'Web design', 'Product design'] }, configuredAt: new Date().toISOString() }, 'request-quote': { adapterId: 'form-action', config: { fields: ['service', 'name', 'email', 'message'] }, configuredAt: new Date().toISOString() } }, activity: [], createdAt: new Date().toISOString() }
  ];
}
function seedDemoIfEmpty() {
  if (!config.autoSeedDemo || store.list().length) return { seeded: false };
  // A public origin is required so the seeded site records never point at localhost.
  if (!config.publicBaseUrl) return { seeded: false, reason: 'PUBLIC_BASE_URL is required for demo auto-seeding.' };
  const websites = demoSites();
  store.replace(websites);
  return { seeded: true, count: websites.length };
}
module.exports = { seedDemoIfEmpty, demoSites };
