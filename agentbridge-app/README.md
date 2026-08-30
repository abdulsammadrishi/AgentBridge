# AgentBridge merchant app

Run the product/API from the repository root:

```powershell
node server/server.js
```

Open [http://localhost:3000](http://localhost:3000).

For the full local ownership-verification demo, also run the store:

```powershell
python -m http.server 8080 --directory demo-site
```

Register `http://localhost:8080`, copy the generated verification tag into
`demo-site/index.html`, refresh the demo site, and press **Check
verification**. Website data is persisted in `server/data/websites.json`.

Capability analysis is deliberately deterministic only for the known local
demo-store adapter. It returns the four capabilities that demo store actually
implements: search products, product details, inventory checks, and add to
cart. Other URLs are shown as not analyzed rather than being presented with
invented capabilities.
