# Omamori — Spec for spiking (ETHGlobal Tokyo 2026)

Sep 26, 2026 · @Ben

## Overview

Omamori (working name, after the Japanese protective charm) is a payment agent for elderly people whose spending rules are set by their family, enforced onchain, and can't be broken even if a scammer manipulates the agent.

**Problem.** Japan's tokushu sagi ("special fraud") scams target elderly people by manipulating them into sending money. As elderly people start relying on AI assistants to pay for shopping, bills and services, scammers will target the agent instead. Prompt injection is ore-ore fraud for AI. Get the latest National Police Agency loss figures for the pitch.

**Product.** A family member owns a parent ENS name and issues the elderly person's agent a subname. The family sets the agent's spending policy in ENS records that the agent itself cannot edit. Every payment is screened by Intercepta before signing, and large or unusual payments need a verified family member's approval through World ID for Agents.

**Target sponsors (3-sponsor cap):**

| Sponsor | Prize | Pool | Priority |
| --- | --- | --- | --- |
| ENS | Best Use of ENSv2 | $6,000 (3k / 2k / 1k) | Main focus, most effort |
| World | Best Use of World ID for Agents | $5,000 (2 x $2,500) | Keep simple and solid |
| Intercepta | Safe Agent-to-Agent Payments with x402 | $2,000 (1,250 / 750) | Core decision logic, moderate effort |

Fallback: if World ID for Agents is blocked, swap in Curvegrid's Best AI Agent Project ($1,000). It needs no specific integration, only a good README.

## Architecture

One paying agent sits in the middle: it reads its policy from ENS, screens with Intercepta, escalates to the family through World ID, and pays sellers over x402.

&#91;embedded content: Omamori architecture · 6 components\]

Sellers can also check the paying agent's ENS name and screen the payer with Intercepta before accepting (stretch goal, see Sellers).

| Component | What it is | Network |
| --- | --- | --- |
| ENSv2 registry and resolvers | Family parent name, agent subnames, policy records, access control | Sepolia (ENSv2 beta) |
| Family agent | Backend service running the agent loop and payment decision | Off-chain; reads Sepolia, pays on x402 testnet |
| Intercepta API | Screens payTo, token and payment authorization | Off-chain API, mainnet risk data |
| World ID for Agents | Family approval for payments over threshold | Event dev environment |
| x402 sellers | 2 to 3 simple paid endpoints (delivery, pharmacy, taxi) | x402 testnet (confirm which; commonly Base Sepolia) |
| Dashboard | Web UI for family and demo: policy, payment log, verdicts with reasons | Hosted publicly (ENS requires a live demo link) |

**Networks.** Using two testnets is fine: ENS reads are plain RPC calls to Sepolia, and payments settle on the x402 testnet. EVM addresses are identical across chains, so the blocked-payment demo can use a known-risky mainnet address (pinned in Intercepta's Discord) as the payTo on testnet.

**Suggested stack.** TypeScript throughout, viem for chain calls, the official x402 SDK for buyer and seller, a small Next.js dashboard. Confirm ENSv2 contract addresses and SDK support from the ENSv2 docs.

## ENSv2 identity and policy

ENS holds the family structure and the agent's spending policy, and ENSv2's Enhanced Access Control guarantees only the family can change that policy.

**Names.**

- Parent: `tanaka.eth` (or a test name), owned by the family member's wallet on Sepolia.
- Agent: `obaachan.tanaka.eth`, issued by the family, with its own Permissioned Resolver so it holds its own records.
- Subname properties: revocable by the parent and non-transferable, so the agent can't move its identity out of the family. Expiry is optional.

**Records.** Text records on the agent's subname. Check ENSIP-26 (agent text records) first and reuse its keys where they fit; the custom keys below are placeholders.

| Record key | Example value | Who can write |
| --- | --- | --- |
| `omamori.maxPerPayment` | `20000000` (20 USDC, 6 decimals), hard limit | Family only |
| `omamori.approvalThreshold` | `3000000` (3 USDC), above this needs family approval | Family only |
| `omamori.monthlyCap` | `50000000` (50 USDC) | Family only |
| `omamori.allowlist` | comma-separated seller ENS names (optional) | Family only |
| `omamori.approver` | family member's World ID for Agents identifier | Family only |
| `description` | "Tanaka family shopping assistant" | Agent |
| `addr` | agent's payment wallet | Family only |

Display amounts in yen in the UI; store and settle in testnet USDC.

**Access control.** Using Enhanced Access Control, the family wallet holds the admin role over the subname and all policy records. The agent's key gets a role scoped to harmless records (like `description`) only. Confirm the exact role and resource model in the EAC docs during the spike.

**What enforces what.** ENS enforces who can change the policy. The limit itself is enforced by deterministic code in the agent's payment decision (see Payment decision flow), which reads the policy fresh from ENS on every payment. The LLM never decides whether a payment is allowed; it only proposes payments. Sellers can independently re-check the payer's ENS status, which is the strongest proof that ENS isn't cosmetic.

**Revocation.** The family revokes `obaachan.tanaka.eth`. The agent's decision code treats a missing or revoked name as "refuse everything", and sellers that check ENS stop accepting it.

## Payment decision flow

Every payment passes through one deterministic `decide()` function; the LLM can propose a purchase but has no path to money except through it.

1. **Propose.** The LLM agent turns a request ("order my usual prescription") into a purchase from a seller endpoint.
2. **Get terms.** The agent calls the seller and receives a 402 response with payment requirements: payTo, amount, asset, network.
3. **Load policy.** Resolve the agent's own ENS name on Sepolia. Confirm the subname is active, then read all `omamori.*` records fresh. No caching of policy.
4. **Check spend.** Sum this month's payments from the agent's local ledger, cross-checked against onchain transfers from the agent wallet.
5. **Screen.** Call Intercepta on the payTo address, the token, and the payment authorization (typed data) before it is signed.
6. **Decide.** Run the rules below in order; the first match wins.
7. **Act.** Pay (sign and send via x402), refuse, or pause and request family approval through World ID.
8. **Log.** Record the decision, the rule that fired and the Intercepta reasons, and show them on the dashboard.

| Order | Condition | Outcome | Reason shown |
| --- | --- | --- | --- |
| 1 | Agent's ENS name missing or revoked | Refuse | Agent is not authorised by the family |
| 2 | Intercepta flags payTo, token or authorization as high risk | Refuse | Intercepta's reasons, verbatim |
| 3 | Amount above `maxPerPayment` | Refuse | Over the family's hard limit |
| 4 | Month spend plus amount above `monthlyCap` | Refuse | Monthly budget used up |
| 5 | Seller not on `allowlist` (if set) | Ask family | New or unknown seller |
| 6 | Intercepta returns warnings but not high risk | Ask family | Intercepta's reasons |
| 7 | Amount above `approvalThreshold` | Ask family | Large payment |
| 8 | Otherwise | Pay | Within policy, screening clean |

Keep `decide()` a pure function of (payment terms, policy, month spend, screening results) so it is easy to unit-test every row of this table.

## Intercepta screening

Intercepta runs live on every payment before signing, and its verdict directly drives rules 2 and 6 of the decision table.

| Check | Endpoint | Side | When |
| --- | --- | --- | --- |
| Is the payTo address risky? | [Quick Scan Address](https://docs.web3antivirus.io/reference/quick-scan-address) | Buyer | Every payment |
| Is this real USDC or a lookalike? | [Scan Token](https://docs.web3antivirus.io/reference/scan-token) | Buyer | Every payment (cache per token) |
| Is the payment authorization safe to sign? | [Scan Message](https://docs.web3antivirus.io/reference/scan-message) | Buyer | Every payment, before signing |
| Is the payer tied to sanctions, stolen funds or scams? | [Deep Scan Address](https://docs.web3antivirus.io/reference/scan-address) | Seller | Stretch: before accepting |

**Verdict mapping.** Map each response to `high` (refuse), `warning` (ask family) or `clean`. Confirm the response fields and risk levels from the [API reference](https://docs.web3antivirus.io/reference/api-overview) during the spike, and keep the raw reasons so the dashboard can show them.

**Request budget.** The sandbox key allows 1,000 requests. At about 3 buyer calls per payment, that's roughly 300 payments. Cache token scans, use recorded fixtures in unit tests only, and keep live calls for integration runs and the demo.

**Rules to respect.** Mocked or hard-coded responses don't qualify, so the demo path must hit the live API. Risk data covers mainnet, so screen real mainnet addresses even though payments run on testnet. Test addresses with known risks are pinned in Intercepta's Discord.

## World ID for Agents: family approval

When `decide()` returns "ask family", the payment pauses until a verified family member approves it through World ID for Agents; anything else means no payment.

1. The agent stores the pending payment and creates a verification request addressed to the approver named in the `omamori.approver` ENS record.
2. The request carries a summary the family sees: seller, amount in yen, and the rule that fired (for example "Large payment" or "New seller").
3. The family member completes verification in the World ID for Agents dev environment.
4. The **backend** validates the result and checks it came from the approver in ENS. An unvalidated client response never authorises anything.
5. Approved: the agent signs and sends the payment. Denied, expired or cancelled: the payment is dropped and logged with the reason.

**Bind approval to one payment.** Tie each verification to the specific pending payment (its id or a hash of its terms) so one approval can't be replayed for a different or larger payment. Check during the spike whether the API supports a context or signal field for this.

**Expiry.** Pending approvals expire after a fixed window (10 minutes is a reasonable default) and the payment is refused.

**Notes.** Proofs in the event environment are mocked with fake identities, which is fine for the demo but must not be treated as production-grade. Keep a running log of time to first success, friction and missing docs for the required integration debrief.

Resources: [World ID for Agents docs](http://sandbox.auth.world.org/docs), [agent plugin](https://github.com/worldcoin/world-id-agent-plugin), [portal](http://sandbox.auth.world.org/portal).

## x402 seller services

Sellers are deliberately simple: each is an x402-protected endpoint that returns a small JSON confirmation, and all the interesting logic stays in the buyer's decision.

| Seller | Price | Purpose in the demo |
| --- | --- | --- |
| Pharmacy delivery | 1 USDC | Normal payment that goes through |
| Grocery delivery | 1 USDC | Normal payment; second everyday service |
| Taxi booking (airport run) | 8 USDC | Above the 3 USDC approval threshold, triggers family approval |
| "Urgent refund fee" (scam) | 5 USDC | payTo is a known-risky mainnet address, blocked by Intercepta |

Prices assume the example policy in the ENS section. Give each legitimate seller an ENS name (for example under a demo parent name) so the allowlist record has something real to reference.

**Seller-side checks (stretch).** Add middleware to the legitimate sellers that runs before accepting payment:

1. The buyer sends its ENS name in a request header.
2. The seller resolves that name on Sepolia, checks it is active, and checks its `addr` record matches the paying wallet.
3. The seller runs Intercepta's Deep Scan Address on the payer.
4. Any failure: reject with a clear reason. This is what makes revocation visible in the demo.

## Demo script

One story, five beats, and every sponsor's required success and failure path appears once.

| Beat | What happens | Proves |
| --- | --- | --- |
| 1. Everyday purchase | Grandma asks for her prescription; the agent pays the pharmacy 1 USDC; dashboard shows "clean" | Intercepta live call, x402 success |
| 2. The scam | A message claims an urgent refund fee; the agent tries to pay; Intercepta flags the address and the payment is refused, reasons on screen | Intercepta blocked payment |
| 3. The big one | The agent books an 8 USDC airport taxi; it pauses for family approval; the family member denies it through World ID; nothing is paid | World ID denied path |
| 4. The manipulation | A scam message convinces the agent it must raise its own limit; it sends the ENS record update; the transaction reverts because only the family can edit policy | ENSv2 access control is load-bearing |
| 5. Revocation | The family revokes the agent's subname; the agent refuses to pay and sellers reject it | ENSv2 revocation, seller-side check |

For beat 4, give the LLM a real "update my spending limit" tool wired to the agent's own key, so the attempt is genuine rather than simulated. Also show one approved payment somewhere (beat 3 can be run twice, approve then deny) since World wants the full journey including the protected action happening.

Script and rehearse the timing; ETHGlobal demos are short, so cut beat 5 first if time is tight.

## Spike plan for Claude Code

Run four independent spikes first, riskiest first, each as a small script with a clear pass/fail, before building the product.

**Spike 1: ENSv2 access control (riskiest).**

- [ ] Register or obtain a parent name on ENSv2 Sepolia from a "family" wallet
- [ ] Create `obaachan.<parent>` with its own Permissioned Resolver
- [ ] Family wallet sets the `omamori.*` text records
- [ ] Grant the agent wallet a role limited to `description` only
- [ ] Agent wallet updates `description`: succeeds
- [ ] Agent wallet updates `omamori.maxPerPayment`: reverts
- [ ] Family revokes the subname; resolution then shows it inactive

**Spike 2: x402 happy path.**

- [ ] One seller endpoint behind x402 on a supported testnet
- [ ] Buyer script pays it with testnet USDC and gets the response
- [ ] Buyer can inspect payment terms and the authorization before signing

**Spike 3: Intercepta.**

- [ ] Live calls to Quick Scan Address, Scan Token and Scan Message
- [ ] One clean and one known-risky mainnet address, responses saved as fixtures
- [ ] Document the response fields used for high / warning / clean

**Spike 4: World ID for Agents.**

- [ ] Create a verification request from the backend
- [ ] Complete it in the dev environment, validate in the backend
- [ ] Handle denied and expired cases
- [ ] Find out whether a request can be bound to a payment id

**Then build, in order:**

1. `decide()` as a pure function with a unit test per row of the decision table.
2. The agent loop: LLM proposes, the pipeline loads policy, screens, decides, acts.
3. Four seller endpoints from the sellers table.
4. Dashboard: policy view, payment log with verdicts and reasons, approval status.
5. Seller-side checks (stretch).
6. Deploy the dashboard publicly and rehearse the demo.

**Working rules for Claude Code.**

- Monorepo, TypeScript: `packages/agent`, `packages/sellers`, `packages/dashboard`, `packages/shared` (policy types, `decide()`), `scripts/spikes`.
- Secrets in `.env` only, never committed; provide `.env.example`.
- No mocked Intercepta or World ID responses on the demo path; fixtures are for unit tests only.
- Keep `notes/feedback-world.md` and `notes/feedback-intercepta.md` updated as friction comes up.
- Commit small and often, with clear messages.
- Record deployed contract addresses, names and test wallets in `notes/deployments.md`.

## Sponsor requirements checklist

Each prize has hard qualification rules from the [prizes page](https://ethglobal.com/events/tokyo2026/prizes); check all of these before submitting.

**ENS: Best Use of ENSv2**

- [ ] Built on ENSv2 on Sepolia
- [ ] ENSv2 features central to the product, not cosmetic
- [ ] Functional demo, no hard-coded values
- [ ] Live demo link in the project showcase
- [ ] Open-source code on GitHub

**World: Best Use of World ID for Agents**

- [ ] Uses the official World ID for Agents dev environment for the event
- [ ] Full journey shown: request, user completion, validated result, protected action
- [ ] Denied, expired or cancelled path where the action does not happen
- [ ] Results validated in a secure backend; no client secrets exposed
- [ ] Integration debrief: time to first success, friction, missing capability or docs, top improvement

**Intercepta: Safe Agent-to-Agent Payments with x402**

- [ ] Working agent payment flow over x402 (testnet is fine)
- [ ] At least one live Intercepta call before a payment is signed or accepted, and its result decides what happens
- [ ] Real mainnet addresses screened
- [ ] Demo shows one payment going through and one blocked or held, reason visible
- [ ] Public GitHub repo; README points to the files calling the API
- [ ] README includes 3 to 5 lines of API feedback

## Open questions and risks

The biggest risk is ENSv2 beta tooling, which is why it is Spike 1; the rest are questions the spikes should answer.

| Risk or question | Impact | Mitigation or fallback |
| --- | --- | --- |
| ENSv2 Enhanced Access Control can't scope agent permissions per record | Beat 4 loses its onchain proof | Scope at name level instead: agent key has no rights at all, policy edits by family only |
| Which testnets does x402 support | Blocks Spike 2 | Check x402 docs first; pick one supported network and note it in deployments |
| World ID for Agents can't bind approval to a payment | Replay risk | Store the approval against the pending payment server-side and consume it once |
| World ID for Agents environment is unstable | World prize at risk | Swap in Curvegrid's AI Agent prize (no required integration) |
| Intercepta 1,000-request limit | Can't test or demo | Cache, use fixtures in unit tests, ask at their booth for more |
| Three integrations spread the team thin | Shallow work on every track | ENS gets the most depth; keep World to one clean flow |
| Demo too long for five beats | Weak final demo | Cut beat 5 first, then merge beats 1 and 2 |

**Open questions for the team**

- [ ] Final product name (Omamori is a placeholder)
- [ ] Dashboard language: Japanese, English or both
- [ ] Who plays the family member and grandma in the demo
