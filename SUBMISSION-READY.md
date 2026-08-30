# Submission readiness

## Deployment

- Platform: Render Blueprint (`render.yaml`) with one free Node service and no persistent disk.
- Merchant app: pending deployment (`PUBLIC_BASE_URL`).
- Store: `<PUBLIC_BASE_URL>/store/`.
- Restaurant: `<PUBLIC_BASE_URL>/restaurant/`.
- Services: `<PUBLIC_BASE_URL>/services/`.
- Persistence: ephemeral JSON storage on Render; clean instances auto-seed the competition demo.

## Operational checklist

1. Create a Render service from this repository and set `PUBLIC_BASE_URL`, `API_BASE_URL`, and `CORS_ORIGINS` to the generated HTTPS URL.
2. Keep `DEMO_RESET_ENABLED=false` and set `AUTO_SEED_DEMO=true` in public deployment.
3. If Chrome origin-trial access is granted, set `WEBMCP_ORIGIN_TRIAL_TOKEN`; the server emits the required meta tag into demo pages.
4. Edit `extension/config.js` to the public base URL, reload the unpacked extension, and approve the exact optional HTTPS origin.
5. Register, verify, analyze, configure, and approve each public demo site before recording.

## WebMCP status

Completed: real in-app-browser discovery and invocation of the store’s read tools.

Pending: manual Chrome page-level lifecycle proof for active action tools and the master OFF/ON kill switch. See [WEBMCP-TEST.md](WEBMCP-TEST.md).

## Remaining before submission

- Deploy from a connected Render account and replace the pending URLs above.
- Run the public HTTPS smoke test in the deployed environment.
- Complete the deferred Chrome local/origin-trial lifecycle test.

Render free-tier data may reset on redeploy/restart. This is acceptable for the competition demo because a clean instance seeds verified websites, configured adapters, approved tools, Agent Access ON, and clean activity history. A production deployment needs durable persistence.
