# Submission readiness

## Deployment

- Recommended platform: Railway, using [`railway.json`](railway.json) for one Node service, with no database or persistent disk.
- Render: [`render.yaml`](render.yaml) remains as a reference configuration, but is not the recommended competition path.
- Merchant app: pending deployment (`PUBLIC_BASE_URL`).
- Store: `<PUBLIC_BASE_URL>/store/`.
- Restaurant: `<PUBLIC_BASE_URL>/restaurant/`.
- Services: `<PUBLIC_BASE_URL>/services/`.
- Persistence: ephemeral JSON storage; clean instances auto-seed the competition demo once its public URL is configured.

## Operational checklist

1. Create a Railway service from this repository. The Railway configuration runs `npm run check`, starts with `npm start`, and health-checks `/`.
2. Generate the Railway HTTPS public domain, then set `PUBLIC_BASE_URL`, `API_BASE_URL`, and `CORS_ORIGINS` to that exact URL. Set `AUTO_SEED_DEMO=true` only after those URLs are set.
3. Keep `DEMO_RESET_ENABLED=false` in public deployment. The first restart with an empty data directory then creates the deterministic demo state.
4. If Chrome origin-trial access is granted, set `WEBMCP_ORIGIN_TRIAL_TOKEN`; the server emits the required meta tag into demo pages.
5. Edit `extension/config.js` to the public base URL, reload the unpacked extension, and approve the exact optional HTTPS origin.
6. Confirm the auto-seeded sites load before recording.

## WebMCP status

Completed: real in-app-browser discovery and invocation of the store’s read tools.

Pending: manual Chrome page-level lifecycle proof for active action tools and the master OFF/ON kill switch. See [WEBMCP-TEST.md](WEBMCP-TEST.md).

## Remaining before submission

- Deploy from a connected Railway account and replace the pending URLs above.
- Run the public HTTPS smoke test in the deployed environment.
- Complete the deferred Chrome local/origin-trial lifecycle test.

Railway’s ephemeral service filesystem may reset on redeploy/restart. This is acceptable for the competition demo because a clean instance seeds verified websites, configured adapters, approved tools, Agent Access ON, and clean activity history. A production deployment needs durable persistence.
