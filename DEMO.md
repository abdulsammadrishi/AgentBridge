# AgentBridge competition demo

AgentBridge helps existing websites expose approved capabilities to AI agents through WebMCP. It never turns detected HTML into an executable action without a known adapter and merchant approval.

## Start the local demo

Start the single local service from the repository root:

```powershell
npm start
```

Open the merchant dashboard at `http://localhost:3000` and load the unpacked Chrome extension from `extension/` using `chrome://extensions`. The same server hosts every local demo path.

## Merchant walkthrough

For each website, register it, copy its displayed verification tag into the matching page's `agentbridge-verification` meta tag, verify ownership, run **Analyze Website**, configure the shown adapters, approve the relevant tools, and turn Agent Access on.

| Demo | Register this URL | Configure and approve |
| --- | --- | --- |
| Store | `http://localhost:3000/store/` | `search_products`, `get_product`, `check_inventory`, `add_to_cart` |
| Restaurant | `http://localhost:3000/restaurant/` | `get_menu`, `get_opening_hours` |
| Services | `http://localhost:3000/services/` | `get_services`, `request_quote` |

Each registered site is matched by exact origin plus its path scope, so the three demos can share one reliable deployment origin while retaining independent policy.

## Agent walkthrough

In a WebMCP-compatible Chrome build, use the page’s debug panel to confirm its actual registered tools. Try the store sequence:

1. `search_products({ query: "black shoes" })`
2. `get_product({ productId: "black-running-shoes" })`
3. `check_inventory({ productId: "black-running-shoes" })`
4. `add_to_cart({ productId: "black-running-shoes", quantity: 1 })`

The final action opens a visible local confirmation panel. Confirming it changes the real demo cart. The service quote action uses the same honest, page-local confirmation pattern and updates its visible fixture state after confirmation.

Turn Agent Access off in the dashboard or extension to see registered tools removed by the page runtime. The dashboard activity feed records adapter, tool, outcome, timestamp, and confirmation requirement without retaining sensitive request contents.

## Reset

Use this only for local recording/development:

```powershell
npm run demo:reset
```

Or call `POST http://localhost:3000/api/demo/reset`. This clears local website registrations, approvals, adapter configurations, and activity history. It is not a production endpoint.

## WebMCP limitation

The pages require a Chrome build that exposes `document.modelContext.registerTool`. Without it, each runtime panel accurately reports **UNSUPPORTED** and no tool is claimed to be registered.
