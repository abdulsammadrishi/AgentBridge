/*
 * WebMCP transport boundary. Merchant policy lives in agentbridge.js so that
 * a later extension or dashboard can control it without changing these tools.
 */
(() => {
  const storefront = window.AgentBridgeStorefront;
  const controllers = new Map();
  const tools = [
    { name: 'search_products', title: 'Search products', description: 'Search the live Northstar catalog by keyword and optional category.', inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Words to match against product names or categories.' }, category: { type: 'string', enum: ['all', 'footwear', 'apparel', 'accessories'], description: 'Optional catalog category.' } }, required: ['query'] }, annotations: { readOnlyHint: true }, execute: async ({ query, category = 'all' }) => storefront.searchProducts(query, category).map(storefront.getProductSummary) },
    { name: 'get_product', title: 'Get product details', description: 'Get full current details and availability for a product by its ID.', inputSchema: { type: 'object', properties: { productId: { type: 'string', description: 'Product ID, for example black-running-shoes.' } }, required: ['productId'] }, annotations: { readOnlyHint: true }, execute: async ({ productId }) => { const product = storefront.getProduct(productId); return product ? storefront.getProductSummary(product) : { error: 'Product not found', productId }; } },
    { name: 'check_inventory', title: 'Check inventory', description: 'Check the current inventory count and availability for a product.', inputSchema: { type: 'object', properties: { productId: { type: 'string', description: 'Product ID to check.' } }, required: ['productId'] }, annotations: { readOnlyHint: true }, execute: async ({ productId }) => { const product = storefront.getProduct(productId); return product ? { productId, name: product.name, inventory: product.inventory, inStock: product.inventory > 0 } : { error: 'Product not found', productId }; } },
    { name: 'add_to_cart', title: 'Add item to cart', description: 'Add an in-stock product to the shopper cart. This changes cart state and requires customer confirmation.', inputSchema: { type: 'object', properties: { productId: { type: 'string', description: 'Product ID, for example black-running-shoes.' }, quantity: { type: 'integer', minimum: 1, description: 'Number of units to add. Defaults to 1.' } }, required: ['productId'] }, annotations: { readOnlyHint: false, requiresConfirmation: true }, execute: async ({ productId, quantity = 1 }) => { const product = storefront.getProduct(productId); if (!product) return { error: 'Product not found', productId }; return window.AgentBridge.confirmAction({ action: 'add_to_cart', requiresConfirmation: true, summary: 'AI wants to add ' + quantity + ' × ' + product.name + ' to the bag.', confirmationMessage: 'Confirm before changing the local cart.' }, () => storefront.addToCart(productId, quantity)); } }
  ];
  const toolByName = new Map(tools.map(tool => [tool.name, tool]));
  const supported = () => Boolean(document.modelContext?.registerTool);
  const changed = () => window.dispatchEvent(new CustomEvent('agentbridge:webmcpchange'));
  tools.forEach(tool => {
    const execute = tool.execute;
    tool.execute = async (input, context) => {
      try { const result = await execute(input, context); window.AgentBridge?.recordActivity(tool.name, input, 'SUCCESS'); return result; }
      catch (error) { window.AgentBridge?.recordActivity(tool.name, input, 'ERROR'); throw error; }
    };
  });
  async function registerTools(names) {
    if (!supported()) return { ok: false, reason: 'unsupported' };
    const errors = [];
    for (const name of names) {
      if (controllers.has(name)) continue;
      const tool = toolByName.get(name);
      if (!tool) { errors.push(name); continue; }
      const controller = new AbortController();
      try { await document.modelContext.registerTool(tool, { signal: controller.signal }); controllers.set(name, controller); }
      catch (error) { console.error('WebMCP registration failed for ' + name, error); errors.push(name); }
    }
    changed();
    return { ok: errors.length === 0, errors };
  }
  function unregisterTools(names) {
    names.forEach(name => { const controller = controllers.get(name); if (controller) { controller.abort(); controllers.delete(name); } });
    changed();
  }
  window.AgentBridgeWebMCP = { tools, supported, registerTools, unregisterTools, unregisterAllTools: () => unregisterTools([...controllers.keys()]), getRegisteredToolNames: () => [...controllers.keys()] };
})();
