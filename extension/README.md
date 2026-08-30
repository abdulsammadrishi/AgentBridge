# AgentBridge Chrome extension

## Load locally

1. Start AgentBridge from the repository root with `node server/server.js`.
2. Start the demo store with `python -m http.server 8080 --directory demo-site`.
3. In Chrome, open `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and choose this `extension` folder.
4. Open `http://localhost:3000`, register `http://localhost:8080`, add its generated verification meta tag to `demo-site/index.html`, then verify and analyze the site.
5. Open `http://localhost:8080` and select the AgentBridge extension.

The popup reads policy only from the AgentBridge API. Its controls include the
active tab URL on every write; the API rejects an id whose registered hostname
does not match that tab.

## Public demo deployment

Before loading the unpacked extension for a deployed HTTPS demo, replace the
origin in `config.js` using `config.production.example.js` as a guide, then
reload the extension. The first popup opening asks the merchant to grant the
exact configured public origin; localhost permissions remain built in for the
competition demo.

## WebMCP note

The extension does not register WebMCP tools. It asks the demo page for the
actual runtime state, while `demo-site/webmcp.js` owns registration. Chrome
must expose `document.modelContext.registerTool` for the popup to report
ACTIVE; otherwise it accurately reports UNSUPPORTED.
