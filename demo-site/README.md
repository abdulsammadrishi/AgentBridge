# AgentBridge demo site

A small, standalone e-commerce storefront used to demonstrate how AgentBridge can make an existing business website agent-ready. It remains completely usable as a normal website when WebMCP is unavailable.

## Run it

From this directory, start a local static server (do not open the file directly):

```powershell
cd demo-site
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Local ownership verification

The demo store includes an AgentBridge verification meta tag in `index.html`.
When the merchant product creates a website record, it generates a unique token.
For local competition testing, copy that generated tag into the demo store's
`head` (replacing the placeholder value), then press **Check verification** in
the AgentBridge app. This keeps the token per-registration rather than embedding
a reusable production-style token in the demo site.

The storefront has no build step and no dependencies. Search, filters, product details, bag quantity controls, and totals all run locally in the browser.

## AgentBridge merchant controls

The prominent **AgentBridge** panel is a local merchant-control demo. Its settings persist in browser local storage, so a refresh keeps the chosen master switch and per-tool permissions.

- **Agent Access ON:** only allowed tools are registered.
- **Agent Access OFF:** all AgentBridge registrations are removed immediately.
- **Tool permissions:** Search products, Product details, Check inventory, and Add to cart are independent. Add to cart defaults to denied.
- **WebMCP Agent View:** reflects only the tools currently registered by the page.

agentbridge.js owns merchant policy, persistence, UI state, and activity logging. webmcp.js remains the WebMCP transport boundary: it calls document.modelContext.registerTool() and removes registrations by aborting the corresponding AbortController signal. This is the current Chrome lifecycle pattern and prevents duplicate registrations during quick setting changes.

## WebMCP implementation

`webmcp.js` uses Chrome's current **Imperative API** entry point:

```js
document.modelContext.registerTool(toolDefinition)
```

Each registration supplies `name`, `title`, `description`, `inputSchema`, `annotations`, and an `execute` function. The three query tools set `annotations.readOnlyHint: true`; `add_to_cart` correctly uses `false` because it changes the shopper's cart.

The WebMCP code is deliberately isolated in `webmcp.js`; the merchant control layer lives in `agentbridge.js`. Tool implementations call the shared `window.AgentBridgeStorefront` state exposed by `app.js`, so agent calls and the visible site always use the same products, inventory, and cart.

### Exposed tools

| Tool | What it does |
| --- | --- |
| `search_products` | Searches the current catalog by keyword/category. |
| `get_product` | Returns details for a product ID. |
| `check_inventory` | Returns the current inventory and stock status. |
| `add_to_cart` | Adds a quantity to the actual visible cart. |

## Test WebMCP

WebMCP is an experimental Chrome web platform feature. Use a current Chrome/Chromium build enrolled in the WebMCP origin trial or early preview program, with WebMCP enabled for the local test origin as required by that build. The browser API requires a secure context; `localhost` is generally treated as trustworthy for local development. For a non-local deployment, serve this demo over HTTPS.

1. Start the server and open the page in the WebMCP-compatible browser.
2. Confirm the lower-left AgentBridge panel reads `WebMCP: ACTIVE`.
3. Use your WebMCP-compatible agent or inspector to discover the four tools registered by the page.
4. Call `search_products` with `{ "query": "runner" }`, then `check_inventory` or `get_product` with a returned ID.
5. Call `add_to_cart` with `{ "productId": "black-running-shoes", "quantity": 1 }`; the website's Bag count, cart drawer, and total update immediately.

If the panel says `UNSUPPORTED`, the page still works normally; that browser does not expose `document.modelContext.registerTool` to the page.

Current API reference: [Chrome WebMCP Imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api).
