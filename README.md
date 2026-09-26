# Omamori

A payment agent for elderly people whose spending rules are set by their family in ENSv2, screened by Intercepta before every signature, and escalated to the family through World ID for Agents, so a scammer who manipulates the agent still can't move the money.

**Live demo:** https://omamori-tokyo.vercel.app · Built at ETHGlobal Tokyo 2026.

## The problem

Japan's *tokushu sagi* ("special fraud") scams manipulate elderly people into sending money. Losses hit a record ¥142.3 billion in 2025, nearly double 2024, and people aged 65 and over accounted for 59.2% of them ([National Police Agency figures via Nippon.com](https://www.nippon.com/en/japan-data/h02795/)). As they start relying on AI assistants to pay for shopping, bills and services, scammers will target the agent instead. Prompt injection is ore-ore fraud for AI. Omamori (お守り, a protective charm) makes the agent safe to manipulate: the LLM can propose payments, but it has no path to money except through rules the family controls.

## How it works

```
obaachan ──chat──▶ Claude assistant ──purchase(seller)──▶ PaymentAgent
                                                          │
         x402 seller ◀── 402 terms ───────────────────────┤ 1. get terms (identifies as obaachan.tanaka.eth)
         ENSv2 Sepolia ◀── read omamori.* records fresh ──┤ 2. load policy (no caching)
         Intercepta ◀── payTo, token, authorization ──────┤ 3. screen before signing
                                                          │ 4. decide(): pay / refuse / ask family
         World ID for Agents ◀── device grant ────────────┤ 5. ask family → one approval per payment
         x402 facilitator ◀── signed EIP-3009 ────────────┘ 6. pay on Base Sepolia, log with reasons
```

Every payment passes through one pure function, [`decide()`](packages/shared/src/decide.ts), with a unit test per rule ([decide.test.ts](packages/shared/src/decide.test.ts)). Screening, the policy read and `decide()` all run **inside the signer** ([payment-agent.ts](packages/agent/src/payment-agent.ts)), so the only way a signature is produced is a "pay" decision.

| Order | Condition | Outcome |
| --- | --- | --- |
| 1 | Agent's ENS name missing or revoked | Refuse |
| 2 | Intercepta flags payTo, token or authorization as high risk (or screening is unavailable) | Refuse |
| 3 | Amount above `omamori.maxPerPayment` | Refuse |
| 4 | Month spend plus amount above `omamori.monthlyCap` (the larger of the ledger and the agent wallet's onchain USDC outflow this month) | Refuse |
| 5 | Seller not on `omamori.allowlist` (ENS name must resolve to the payTo) | Ask family |
| 6 | Intercepta warnings | Ask family |
| 7 | Amount above `omamori.approvalThreshold` | Ask family |
| 8 | Otherwise | Pay |

## ENSv2 (Sepolia)

ENS is the load-bearing part of the product, not a label.

- **Family namespace.** The family owns `tanaka.eth` with its own UserRegistry, and issues the agent `obaachan.tanaka.eth` with **its own PermissionedResolver**, so the agent's identity and records are its own.
- **Policy in records the agent can't edit.** `omamori.maxPerPayment`, `omamori.approvalThreshold`, `omamori.monthlyCap`, `omamori.allowlist`, `omamori.approver` and `addr` are set by the family. With **Enhanced Access Control**, the agent's key is granted `ROLE_SET_TEXT` on the `description` key only (`grantSetterRoles`). When the agent is talked into raising its own limit, the transaction is really sent and [reverts onchain](https://sepolia.etherscan.io/tx/0x9d73174846993e7d1e070f5a3584921afd283c907faace638115326ce440369c).
- **Non-transferable.** The subname is registered without `ROLE_CAN_TRANSFER_ADMIN`; transfers revert with `TransferDisallowed`.
- **Revocable.** `unregister` makes the name inactive. The agent then refuses everything, and sellers refuse the payer.
- **Sellers have names too.** `pharmacy.omamori-demo.eth`, `grocery.` and `taxi.` resolve to the seller wallet. The agent only treats a seller as that name if the name's `addr` equals the payTo it is asked to pay, so an impostor claiming to be the pharmacy is "unverified" and needs family approval.
- **Seller-side check.** Legit sellers resolve the payer's `X-Payer-ENS` name and refuse unless it is active and its `addr` is the paying wallet ([payer-check.ts](packages/shared/src/payer-check.ts)).

Code: [ens.ts](packages/shared/src/ens.ts) (addresses, ABIs, `readPolicy`), [ens-admin.ts](packages/shared/src/ens-admin.ts) (family-side writes), [self-policy.ts](packages/agent/src/self-policy.ts) (the agent's own write attempt), [scripts/spikes/1-ensv2.ts](scripts/spikes/1-ensv2.ts) (end-to-end proof), [scripts/family.ts](scripts/family.ts) (`revoke | restore | status`). Deployed names and addresses: [notes/deployments.md](notes/deployments.md).

## Intercepta

Every payment is screened live before it is signed; the verdicts drive rules 2 and 6. Missing or failing screening refuses the payment (fail closed). Risk data is mainnet, so testnet USDC is screened as canonical Base USDC and the payTo is a real mainnet address.

**Files calling the API:**
- [packages/shared/src/intercepta.ts](packages/shared/src/intercepta.ts): client for Quick Scan Address, Deep Scan Address, Scan Token and Scan Message, plus the high / warning / clean mapping
- [packages/agent/src/screening.ts](packages/agent/src/screening.ts): buyer-side screening of payTo, token and the EIP-3009 authorization before signing
- [packages/shared/src/payer-check.ts](packages/shared/src/payer-check.ts): seller-side Deep Scan of the payer before accepting
- [scripts/spikes/3-intercepta.ts](scripts/spikes/3-intercepta.ts): live spike that saves fixtures

**API feedback:**
- Time to first call: minutes once we had a key, but the sandbox key arrived by email many hours into the hackathon, so all integration was written against the docs first. Instant keys from a dashboard would help a lot.
- Biggest gotcha: Scan Message documents `message` as a JSON string, but a stringified typed-data message is silently parsed as empty and scored Low. Sent as an object, it recognises EIP-3009 `TransferWithAuthorization` and flags a malicious payTo as High / `KNOWN_MALICIOUS`.
- No example response bodies or documented scale for `toxicScore` or trait `risk`; real data (toxicScore 100 plus trait names) made the mapping easy once we had it.
- Quick Scan returns 404 for contract addresses, and address scans take no chain id; the docs' example address isn't flagged, so a documented known-bad test address would help.

**Live proof:** the scam seller's payTo is the OFAC-listed Ronin bridge exploiter address. Intercepta returns toxicScore 100 (known_scammer, sanction_address, blacklist) and flags the authorization as KNOWN_MALICIOUS, so the agent refuses before signing. Clean payments settle, for example [0x33cb…5018](https://sepolia.basescan.org/tx/0x33cbebe4f446cd765377d1ab5a73e56641c8180319d24972e591a06f679e5018).

## World ID for Agents

When `decide()` asks the family, the agent starts a World ID for Agents device-grant request. The family member reviews the seller, amount and reason on the dashboard and approves or denies through World ID. The backend validates the `id_token` against World's JWKS and checks that its `sub` matches `omamori.approver` in ENS before anything is paid.

- **Bound to one payment.** Each approval is stored against the hash of the exact payment terms, can be consumed once, and expires after 10 minutes ([approvals.ts](packages/agent/src/approvals.ts), tests in [approvals.test.ts](packages/agent/src/approvals.test.ts)). Approvals from anyone other than the ENS approver are treated as denied.
- **Denied, expired and cancelled** approvals never pay; the payment is logged with the reason.
- **Secure backend.** Client secret and device codes stay server-side ([world-approval.ts](packages/agent/src/world-approval.ts), [activity.ts](packages/dashboard/src/lib/server/activity.ts)).

**Integration debrief:**
- *Time to first success:* first validated `id_token` on the first run of our spike script, in the same session as portal signup.
- *Friction:* it's a standard OIDC device grant rather than an "agents" SDK, which took a moment to realise; redirect URIs must be HTTPS even for device-only clients; `verification_uri_complete` points at `/authorize?transaction_id=…`, not the `/device` page the docs describe; `amr` is always `["pop"]`, so `auth_time` is the only freshness signal.
- *Missing capability:* the device grant can't carry per-request context (no `binding_message` or `authorization_details`), and the approval page shows only the client name, not what is being approved. We bind approvals server-side and show the terms on our own page.
- *Biggest improvement:* a binding message shown on World's approval screen and signed into the token, so the human sees and approves the exact action.

## x402

Sellers are x402-protected Next.js route handlers ([route.ts](packages/dashboard/src/app/api/sellers/[seller]/route.ts), catalog in [catalog.ts](packages/sellers/src/catalog.ts)). The buyer uses `@x402/core` directly so it can inspect the terms and typed data before deciding to sign. Payments settle in testnet USDC on Base Sepolia through the public facilitator.

## Repo layout

| Path | What |
| --- | --- |
| `packages/shared` | Policy types, `decide()`, ENSv2 helpers, Intercepta client, payer check |
| `packages/agent` | Payment pipeline, screening, ledger, World ID approvals, Claude assistant |
| `packages/sellers` | Seller catalog (pharmacy, grocery, taxi, and a scam "urgent refund fee") |
| `packages/dashboard` | Next.js app on Vercel: sellers, chat API, family dashboard |
| `scripts/spikes` | The four integration spikes, each with a pass/fail |
| `notes` | Spec, prize checklist, deployments, sponsor feedback |

## Setup and testing

```bash
bun install
cp .env.example .env   # fill in keys; see notes/deployments.md
bun test               # decide(), approvals, payer check
cd packages/dashboard && bun run dev
```

- `bun scripts/chat.ts` talks to the assistant from the terminal; `bun scripts/purchase.ts <pharmacy|grocery|taxi|refund> [--wait]` runs one purchase.
- `bun scripts/family.ts revoke | restore | status` are the family's controls.
- Spikes: `bun scripts/spikes/1-ensv2.ts` (add `FORK=1 SEPOLIA_RPC_URL=<anvil fork>` to run without spending gas), `2-x402.ts`, `3-intercepta.ts`, `4-world-id.ts`.

## Team

Ben Harper (solo), GitHub [@ben-harper27](https://github.com/ben-harper27).

## AI tools

Built by one person with Claude Code (Anthropic) as the coding agent, working from a spec the human wrote before building ([notes/spec.md](notes/spec.md)).

- **Human:** the product idea and spec; the choice of sponsors and architecture; every product and engineering decision made during the build (for example running everything on Vercel with Postgres, keeping enforcement in ENS and onchain rather than using ENS as a database, USDC-only amounts, how the scam demo should behave, rate-limiting the public API); and every real-world step (World ID portal setup and approvals, testnet funding, Vercel and Neon provisioning, publishing).
- **Claude Code:** researched the sponsor APIs, and wrote the code, tests, scripts and docs in `packages/`, `scripts/`, `README.md` and `notes/` (other than `spec.md`). It also ran the spikes and deployments under the human's direction.
- **In the product:** the runtime assistant uses Claude (`claude-opus-5`) through the Anthropic API ([assistant.ts](packages/agent/src/assistant.ts)).

The commit history shows the build step by step during the event.
