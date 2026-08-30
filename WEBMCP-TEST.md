# WebMCP environment validation — 2026-08-30

## Environment actually tested

- Surface: Codex in-app browser WebMCP capability.
- Browser version: not exposed by the browser-control surface.
- Pages: store `http://localhost:8080/`, restaurant `http://localhost:8091/restaurant/`, and services `http://localhost:8092/services/`.

This was a real browser capability check and tool invocation, not a mock of `document.modelContext`.

## Page feature detection

| Page | `typeof document.modelContext` | `typeof document.modelContext?.registerTool` | Browser WebMCP discovery |
| --- | --- | --- | --- |
| Store | `undefined` | `undefined` | Three real read tools discovered |
| Restaurant | `undefined` | `undefined` | No tools (adapter configuration not present) |
| Services | `undefined` | `undefined` | No tools (adapter configuration not present) |

The in-app browser still exposed and successfully invoked the store's registered read tools through its WebMCP capability. Because the document API itself is not available in this environment, this is not proof that this browser can run the full page-owned registration lifecycle after a reload or policy change.

## Real store tool evidence

The in-app WebMCP capability discovered:

- `search_products`
- `get_product`
- `check_inventory`

Actual invocations:

| Tool | Input | Result |
| --- | --- | --- |
| `search_products` | `{ "query": "black" }` | Returned Black Running Shoes ($79, inventory 12) and Black Formal Shirt ($55). |
| `get_product` | `{ "productId": "black-running-shoes" }` | Returned Black Running Shoes, footwear, $79 USD, in stock, inventory 12. |
| `check_inventory` | `{ "productId": "black-running-shoes" }` | Returned `inStock: true`, inventory 12. |

`add_to_cart` was not discovered in this reset, unconfigured policy state, so it was not invoked. This is expected: AgentBridge must not expose an action tool until the merchant has approved it and Agent Access is on. No bypass or fake call was used.

## Kill switch, restaurant, and services results

- Kill switch: not run as a real browser proof. The current browser does not expose `document.modelContext`, so it cannot prove the page-owned register/unregister lifecycle. AgentBridge's existing unit tests cover the policy gates, but they are not presented as browser proof.
- Restaurant: no configured and approved registration existed; no tools were discovered in this environment.
- Services: no configured and approved registration existed; no tools were discovered in this environment.
- Confirmation: not bypassed or simulated. The store and services runtimes contain visible page-local confirmation panels, but action invocation needs a browser with the document API and an active configured policy.

## Official local testing path

Chrome documents WebMCP as an origin trial beginning with Chrome 149. For local development, use a current Chrome build and enable:

1. Navigate to `chrome://flags/#enable-webmcp-testing`.
2. Enable **WebMCP testing**.
3. Relaunch Chrome.
4. Start the local services listed in [DEMO.md](DEMO.md), complete merchant verification/configuration/approval, and open each demo origin in that Chrome profile.
5. Confirm `typeof document.modelContext === "object"` and `typeof document.modelContext.registerTool === "function"` before calling tools through a WebMCP-aware agent or the Chrome Model Context Tool Inspector.

For non-local deployment, register the site for the Chrome WebMCP origin trial and serve it over HTTPS. See Chrome's [WebMCP overview](https://developer.chrome.com/docs/ai/webmcp), [Imperative API guide](https://developer.chrome.com/docs/ai/webmcp/imperative-api), and [origin-trial announcement](https://developer.chrome.com/blog/ai-webmcp-origin-trial).

## Compatibility review

AgentBridge uses the documented current API:

- `document.modelContext.registerTool(...)`
- `AbortController` signal cancellation to remove registrations
- `annotations.readOnlyHint` for read tools
- page-owned tool execution and backend-sourced policy

Chrome's current documentation specifically describes `document.modelContext` for registration and abort-signal-based unregistration. The project does not use the retired `navigator.modelContext` name.

## Remaining blocker

The only blocker to complete browser proof of the action flow, runtime kill switch, restaurant, and services tools is access to a Chrome profile with the WebMCP local-testing flag or origin trial enabled **and** a WebMCP-aware agent surface. The current in-app browser discovered real store read tools but did not expose the page API, so it is insufficient for the complete Phase 8 proof.

## Chrome Local WebMCP Lifecycle Test — Phase 8B

### Result: blocked before Chrome interaction

- Chrome installed locally: `151.0.7922.174` at `C:\Program Files\Google\Chrome\Application\chrome.exe`.
- Flag required: `chrome://flags/#enable-webmcp-testing` → **Enabled** → relaunch Chrome.
- Chrome was not connected to this workspace's browser-control surface, so no Chrome tab could be opened, the flag could not be inspected or enabled, and DevTools could not be queried.

Accordingly, the following are **not tested in Chrome** and must not be treated as proof: `document.modelContext` exposure, the four-tool registration list, `add_to_cart` confirmation/cart mutation, master OFF/ON unregistration and restoration, individual permission removal/restoration, extension status, and activity events from a Chrome action invocation.

### Exact completion steps after Chrome is connected

1. In Chrome 151, open `chrome://flags/#enable-webmcp-testing`, enable the flag, and relaunch.
2. Run `npm run demo:reset`, then follow [DEMO.md](DEMO.md) to start the backend and local store.
3. Register and verify `http://localhost:8080`, analyze it, approve `search_products`, `get_product`, `check_inventory`, and `add_to_cart`, then enable Agent Access.
4. In DevTools Console, record `typeof document.modelContext` and `typeof document.modelContext?.registerTool`; expected successful values are `object` and `function`.
5. Use a WebMCP-aware agent or Chrome’s Model Context Tool Inspector to discover all four tools. Invoke the three reads, then call `add_to_cart`; use the visible in-page confirmation panel and verify the cart changes only after **Confirm**.
6. Turn Agent Access OFF through the AgentBridge extension and record that the backend policy, debug panel, and discovered-tool list all become inactive. Turn it ON again and confirm the approved tools return.
7. Disable only `add_to_cart`, verify it disappears while the three reads remain, then re-enable it and confirm it returns.

No code fix was made in Phase 8B because no Chrome lifecycle defect was observed. The existing `AbortController` registration/unregistration implementation remains unchanged.
