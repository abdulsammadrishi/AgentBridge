# AgentBridge adapter framework

Adapters are known, audited execution paths; analyzer signals alone never
become executable tools. The registry gates every runtime tool on verified
ownership, master access, merchant approval, a supported adapter, and valid
configuration where required.

- `demo-store-products` reuses the existing demo page's catalog/cart runtime.
- `static-data` serves merchant-reviewed menu, hours, services, or contact data.
- `form-action` supports local-fixture quote/booking preparation and always
  declares `requiresConfirmation: true`; it never submits third-party forms.

Production adapters should additionally include authenticated credentials
handling, server-side audit controls, tenant isolation, and integrations with
the merchant's explicit consent.
