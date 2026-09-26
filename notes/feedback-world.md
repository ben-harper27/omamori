# World ID for Agents — integration feedback

Time to first success: first validated id_token on first run of the spike script, same session as portal signup.

## Friction log

- No dedicated "agents" SDK; it's a standard OIDC device grant. Good once you realise it, but the naming made us look for an agents API first.
- Device grant can't carry per-request context (no binding_message / authorization_details), so an approval can't be cryptographically bound to one payment. We bind server-side: one device_code per pending payment, consumed once.
- Approval page shows only the registered client name and user_code, not what is being approved; we have to show payment terms on our own page.
- Redirect URI must be HTTPS (no localhost) even for device-only clients.
- `amr` is always `["pop"]`, so it doesn't signal fresh re-authentication; rely on `auth_time`.
- `verification_uri_complete` points at `/authorize?transaction_id=...`, not the `/device` page the docs describe.
