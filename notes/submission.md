# Submission pack (ETHGlobal Tokyo 2026 Hacker Dashboard)

Deadline: **Sunday 27 Sep 2026, 09:00 JST**. Submitting anything before the deadline is also what returns the stake.

## Status

**Submitted** on the Hacker Dashboard (Partner Prizes only: World, ENS, Intercepta; Building from Scratch). Editable until 09:00 JST.

Still to do before the deadline:
- [x] Intercepta key: live screening running on production, README updated
- [ ] Upload the demo video (Video step)
- [ ] Optionally switch submission type to Top 10 Finalist if presenting live
- [ ] "Continuing this project" question was left blank (optional)

## Before you press submit

- [ ] Intercepta key in and at least one live screening call deciding a payment (required for the Intercepta prize)
- [ ] Demo video recorded (2–4 min, ≥720p, your voice, no speed-up); see `notes/demo-script.md`
- [ ] Choose submission type: **Finalist + Partner Prizes** (you present 4 min + 3 min Q&A live) or **Partner Prizes only**
- [ ] Select exactly these 3 partner prizes: ENS, World, Intercepta

## Project name

Omamori

## Short description

AI payment agent for the elderly: family rules in ENSv2, Intercepta screening, World ID approval.

## Description

Japan's tokushu sagi scams took a record ¥142.3 billion in 2025, and people over 65 bore 59% of the losses. As elderly people start letting AI assistants pay for shopping, prescriptions and taxis, scammers will manipulate the agent instead: prompt injection is ore-ore fraud for AI.

Omamori is a payment agent that stays safe even when it is fooled. The family owns an ENS name and issues the agent a subname (obaachan.tanaka.eth) whose text records hold the spending policy: a hard limit, an approval threshold, a monthly budget, trusted sellers and the family approver. The agent can read those records but ENSv2 access control stops it from changing them. Before every payment it reads the policy fresh, has Intercepta screen the payee, token and payment authorization, and runs one deterministic decision function. Small, clean payments go through over x402. Scams are refused with reasons. Large or unusual payments wait for a family member to approve through World ID. If the family revokes the name, the agent stops, and sellers refuse it too.

## How it's made

TypeScript monorepo (bun). A pure `decide()` function with a unit test per rule is the only path to money; screening, the ENS policy read and the decision run inside the signer, so only a "pay" decision can produce a signature.

- **ENSv2 (Sepolia beta):** family UserRegistry, a PermissionedResolver per agent, Enhanced Access Control granting the agent key `ROLE_SET_TEXT` on `description` only, a non-transferable subname, revocation via `unregister`, ENS names for sellers (the agent only trusts a seller name whose addr matches the payTo), and a seller-side check of the payer's name. The agent's attempt to raise its own limit is a real transaction that reverts onchain.
- **Intercepta:** Quick Scan Address, Scan Token and Scan Message on every payment before signing, Deep Scan on the seller side, fail-closed when screening is unavailable.
- **World ID for Agents:** OIDC device grant; the backend validates the id_token against World's JWKS, checks `sub` against the approver in ENS, and binds each approval to one payment's terms hash (single use, 10-minute expiry).
- **x402 v2** on Base Sepolia with the public facilitator; sellers are x402-protected Next.js route handlers.
- **Monthly cap** uses the larger of the ledger and the agent wallet's onchain USDC outflow, so the database can't lower it.
- **Claude** (Anthropic API tool runner) is the conversational layer; it only proposes purchases.
- Next.js 16 + shadcn + TanStack Query on Vercel, Neon Postgres for approvals and the log, viem throughout.
- Built with Claude Code from a spec written up front; see README "AI tools".

## Links

- GitHub: https://github.com/ben-harper27/omamori
- Live demo: https://omamori-tokyo.vercel.app
- Beat 4 onchain proof: https://sepolia.etherscan.io/tx/0x9d73174846993e7d1e070f5a3584921afd283c907faace638115326ce440369c

## Partner prize: ENS, Best Use of ENSv2

**How we used it.** The family owns `tanaka.eth` with its own UserRegistry and issues the agent `obaachan.tanaka.eth` with its own PermissionedResolver. The spending policy lives in `omamori.*` text records that the agent reads fresh before every payment. Enhanced Access Control gives the agent's key `ROLE_SET_TEXT` on `description` only, so when a scammer convinces the agent to raise its own limit, the real transaction reverts onchain. The subname is non-transferable (no `ROLE_CAN_TRANSFER_ADMIN`) and revocable via `unregister`; revocation makes the agent refuse everything and sellers refuse the payer. Sellers have ENS names too (`pharmacy.omamori-demo.eth`), and the agent only trusts a seller name whose `addr` matches the payTo, so impostors need family approval.

**Feedback.** The contracts-v2 `main` branch didn't match the live Sepolia deployment (older addresses, `authorizeTextRoles` vs `grantSetterRoles`); the docs deployments page and the `deploy/sepolia-migration-20260915` branch were correct. `grantRoles` reverting on the PermissionedResolver in favour of `grantSetterRoles` was surprising at first but elegant. viem's `getEnsText` worked unmodified against the v2 Universal Resolver. Per-key EAC scoping is exactly what agent identities need.

## Partner prize: World, Best Use of World ID for Agents

**How we used it.** When a payment is large or unusual, the agent pauses and creates a World ID for Agents device-grant request. The family member sees the seller, amount and reason on the dashboard and approves or denies through World ID. The backend validates the id_token against World's JWKS and checks `sub` equals the approver stored in ENS. Approvals are bound server-side to the hash of one payment's terms, single-use and expire after 10 minutes; denied, expired and cancelled requests drop the payment. The client secret and device codes never leave the server.

**Debrief.**
- Time to first success: first validated id_token on the first run of our spike script, in the same session as portal signup.
- Friction: it's a standard OIDC device grant rather than an agents SDK; redirect URIs must be HTTPS even for device-only clients; `verification_uri_complete` points at `/authorize?transaction_id=…` rather than the documented `/device`; `amr` is always `["pop"]`.
- Missing: no per-request context (binding message or authorization_details) and the approval screen shows only the client name.
- Biggest improvement: a binding message shown on World's approval screen and signed into the token.

## Partner prize: Intercepta, Safe Agent-to-Agent Payments with x402

**How we used it.** The paying agent screens the x402 payTo (Quick Scan Address), the token (Scan Token) and the EIP-3009 authorization (Scan Message) live before signing. High risk refuses the payment with Intercepta's reasons shown, warnings escalate to the family, and unavailable screening refuses (fail closed). Legit sellers also Deep Scan the payer before accepting. Mainnet risk data is used while payments settle on Base Sepolia. Files calling the API are listed in the README.

**Feedback.** Same as the README "Intercepta" section (fill in time to first call once the key arrives).

## Pre-existing work

None. All project work started at the event; the spec in `notes/spec.md` was written at the start of hacking. Public libraries only (viem, x402, Next.js, shadcn, Anthropic SDK).
