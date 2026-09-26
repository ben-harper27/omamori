# ETHGlobal Tokyo 2026 – Prize Requirements

Source: https://ethglobal.com/events/tokyo2026/prizes (plus per-sponsor pages, identical content), https://ethglobal.com/events/tokyo2026/info/details, https://ethglobal.com/events/tokyo2026/info/start, https://ethglobal.com/rules. Fetched 2026-09-26.

Targets: ENS "Best Use of ENSv2", World "Best Use of World ID for Agents", Intercepta "Safe Agent-to-Agent Payments with x402". Fallback: Curvegrid "Best AI Agent Project".

Note: each of these sponsors also lists a separate prize marked "🆕 This prize is only available to Continuity Track participants". Those are NOT our targets (we are Classic "From Scratch" track) – do not select/confuse them:
- ENS: "🔗 Best Integration of ENSv2 into an Existing Project" ($4,000) – Continuity only
- World: "🎉 Best Use of World ID for Agents" ($2,500) and "🎉 [Cont] Best IDKit Use Case" ($2,500) – Continuity only
- Intercepta: "🧩 Add Payment Screening to Your Agent or x402 Service" ($500) – Continuity only

---

## 1. ENS – 🧬 Best Use of ENSv2 – $6,000

Sponsor total: $10,000.

**Prize split**
- 🥇 1st place: $3,000
- 🥈 2nd place: $2,000
- 🥉 3rd place: $1,000

**Description (what they want)**

ENSv2 beta is now live on Sepolia — be among the first to build on it. Explore the new hierarchical registry structure: resolve subnames straight off a parent's resolver with wildcard resolution, or deploy your own subname registry to tokenize and manage subnames under your own rules. Use Enhanced Access Control, the shared, role-based permission system behind both registries and resolvers, to delegate specific rights — like letting an account edit only certain text records on a name. Give subnames their own Permissioned Resolver so they fully own their data, mix in record aliasing at the resolver level or namespace aliasing via a shared registry, and combine it all to build subname setups — expiring, revocable, non-transferable vs. transferable, even forever names with no parent control. Bonus points if you bring AI agents into the mix — think agents as namespaces, each with their own identity and permissions.

**Qualification requirements**
- [ ] Project must be built on ENSv2 (Sepolia).
- [ ] ENSv2 features should be central to the product, not a cosmetic add-on.
- [ ] Your demo must be functional and not just include hard-coded values.
- [ ] Upon submission, your project showcase must have a link to a live demo.
- [ ] The code needs to be open source and accessible on Github or a similar platform.

**Judging criteria**
- No separate rubric given. Implied from description: centrality/depth of ENSv2 features (hierarchical registry, wildcard resolution, own subname registry, Enhanced Access Control, Permissioned Resolver, record/namespace aliasing, expiring/revocable/non-transferable/forever subnames).
- "Bonus points if you bring AI agents into the mix — think agents as namespaces, each with their own identity and permissions."

**Submission deliverables**
- [ ] Live demo link in the ETHGlobal project showcase
- [ ] Public open-source repo (GitHub or similar)
- [ ] Working (non-hard-coded) demo on Sepolia ENSv2

**Links and resources**
- Permissioned Registry docs: https://docs.ens.domains/ensv2/permissioned-registry
- Permissioned Resolver docs: https://docs.ens.domains/ensv2/permissioned-resolver/
- Enhanced Access Control docs: https://docs.ens.domains/ensv2/enhanced-access-control/
- Guide for Contract Developers: https://docs.ens.domains/ensv2/tutorial-contract-developers/
- Guide for App Developers (listed under the Continuity prize, still useful): https://docs.ens.domains/ensv2/tutorial-app-developers/
- ENSv2 docs: https://docs.ens.domains/ensv2/overview/
- Building with AI: https://docs.ens.domains/building-with-ai/
- Agent-native CLI: https://github.com/ensdomains/ens-cli
- AI Agent Registry ENS Name Verification (ENSIP-25): https://docs.ens.domains/ensip/25/
- Agent Text Records (ENSIP-26): https://docs.ens.domains/ensip/26/
- Workshop: "ENSv2 - Identity for Apps, Agents & Beyond" – 03:00 PM JST, Fri Sep 25 2026, 5F Workshop Room (video on prize page)

---

## 2. World – 🤖 Best Use of World ID for Agents – $5,000

Sponsor total: $15,000.

**Prize split**
- Up to 2 teams will receive $2,500 each

**Notice on the prize page**
- "We are mocking proofs now, so you don't need sandbox app anymore"
- (On the Continuity variant of the same prize: "Proofs are using fake identities, DO NOT rely in them for production")

**Description (what they want)**

Build an application using World ID for Agents. We are especially interested in agentic products, but any compelling use case is eligible.

Show what becomes possible when an application can ask a person to authenticate or complete a fresh verification at the moment.

Strong submissions will show a meaningful action that needs a human identity or approval layer, not simply a login screen added to an existing product.

**Qualification requirements**
- [ ] Integrate with the official World ID for Agents on dev environment provided for the event.
- [ ] Demonstrate the complete journey: identity or verification request, user completion, validated result, and the protected application or agent action.
- [ ] Demonstrate a denied, expired, cancelled, or otherwise unsuccessful path where the protected action does not occur.
- [ ] Validate identity results in a secure backend; do not expose client secrets or treat an unvalidated client response as authorization.
- [ ] Include a short integration debrief/feedback: time to first success, friction encountered, missing capability or documentation, and the one improvement with the greatest impact.

**Judging criteria**
- Especially interested in agentic products (any compelling use case eligible).
- "Strong submissions will show a meaningful action that needs a human identity or approval layer, not simply a login screen added to an existing product."
- Show what becomes possible when an app can ask a person to authenticate / complete a fresh verification at the moment.

**Submission deliverables**
- [ ] Demo (video/live) showing full happy path: request -> user completion -> backend-validated result -> protected agent action executes
- [ ] Demo showing unsuccessful path (denied / expired / cancelled / other) where the protected action does NOT occur
- [ ] Backend validation code (no client secrets exposed in frontend)
- [ ] Integration debrief/feedback covering all four items:
  - [ ] time to first success
  - [ ] friction encountered
  - [ ] missing capability or documentation
  - [ ] the one improvement with the greatest impact

**Links and resources**
- World ID for Agents documentation: http://sandbox.auth.world.org/docs
- AgentPlugin: https://github.com/worldcoin/world-id-agent-plugin
- World ID for Agents Portal: http://sandbox.auth.world.org/portal
- Simulator: https://simulator.worldcoin.org/id/0x18310f83
- iOS Sandbox app: https://testflight.apple.com/join/Tub7zuyD (page says not needed now that proofs are mocked)
- Developer Portal (listed under IDKit prize): https://developer.worldcoin.org
- Monid.ai promo code (from World "About"): WORLDID-HACKATHON-20
- Workshop: "World's latest products (IDP vs IDKit)" – 05:30 PM JST, Fri Sep 25 2026, 5F Workshop Room (video on prize page)

---

## 3. Intercepta – 🛡️ Safe Agent-to-Agent Payments with x402 – $2,000

Sponsor total: $2,500.

**Prize split**
- 🥇 1st place: $1,250
- 🥈 2nd place: $750

**About / API key**
- Intercepta: real-time security and compliance layer for onchain payments. One API call screens a wallet, contract, token, signature or transaction and returns a verdict with reasons: sanctions and AML exposure, scam and phishing attribution, drainer approvals, fake tokens, simulated balance changes.
- "As agents start paying each other over x402, that check has to live inside the payment flow: before an agent signs a payment, and before a service accepts one."
- Every hacker gets a free sandbox key with 1,000 requests at intercepta.io/ethglobal. Keys arrive by email within a few hours. Need more? DM them on X or come to their booth.

**Description (what they want)**

Agents are starting to pay each other: for an API call, a dataset, compute or another agent's work, often over x402. Most of those payments get signed with no one checking who is on the other side. Build the check that makes agent-to-agent payments safe.

Use the Intercepta API inside an agent payment flow, so every payment is screened before the agent signs it or the service accepts it. Show the verdict in the flow and let it decide what happens next: pay, refuse, cap the amount or ask a human.

Where they'll lean in, and help most at the booth:
- **The paying agent.** Before it signs an x402 payment, screen the destination address (payTo), the token (real USDC or a lookalike) and the payment authorization itself. Enforce spending limits and stop what fails, inside the agent loop.
- **The paid agent or service.** An x402 endpoint or facilitator that screens the payer's wallet for sanctions, stolen funds and scam exposure before it accepts or settles.
- **Counterparty risk for agents.** A risk profile with reasons for every agent or wallet on the other side, so agents can decide who to pay, who to serve and how far to trust them.

x402 is the focus, and other agent payment protocols count too.

**Qualification requirements**
- [ ] A working agent payment flow, x402 preferred. Payments can run on a testnet.
- [ ] At least one live call to the Intercepta API (free key at intercepta.io/ethglobal) runs before a payment is signed or accepted, and its result decides what happens next.
- [ ] Mocked or hard-coded responses don't qualify.
- [ ] Their risk data covers mainnet, so screen real mainnet addresses even when the payment runs on a testnet. (Test addresses with known risks are pinned in their Discord channel.)
- [ ] Your demo shows one payment that goes through and one that is blocked or held, with the reason visible.
- [ ] Public GitHub repo.
- [ ] The README points to the files where the API is called.
- [ ] The README includes 3 to 5 lines of feedback on the API: time to first call, what confused you, what was missing.

**Judging criteria**
- "We judge the moment of decision, not the size of the project":
  - how clearly the risk shows up
  - how naturally it fits the payment flow
  - whether an agent's owner would trust it with real money
- Verdict should drive next step: pay, refuse, cap the amount, or ask a human.

**Submission deliverables**
- [ ] Public GitHub repo
- [ ] README section linking the exact file(s) where the Intercepta API is called
- [ ] README with 3–5 lines of API feedback (time to first call / what confused you / what was missing)
- [ ] Demo: one payment passes, one blocked or held, reason visible
- [ ] Live (not mocked) Intercepta calls against real mainnet addresses

**Links and resources**
- Get a free API key: https://intercepta.io/ethglobal
- x402 quickstart for buyers: https://docs.x402.org/getting-started/quickstart-for-buyers
- x402 quickstart for sellers: https://docs.x402.org/getting-started/quickstart-for-sellers
- Scan Message (check the payment authorization): https://docs.web3antivirus.io/reference/scan-message
- Quick Scan Address (fast check on payTo or payer): https://docs.web3antivirus.io/reference/quick-scan-address
- Deep Scan Address (sanctions, AML and scam exposure): https://docs.web3antivirus.io/reference/scan-address
- Scan Token (real USDC or a lookalike): https://docs.web3antivirus.io/reference/scan-token
- Intercepta API reference: https://docs.web3antivirus.io/reference/api-overview
- x402 docs: https://docs.x402.org/
- A2A x402 extension: https://github.com/google-agentic-commerce/a2a-x402
- Intercepta on X: https://x.com/intercepta_
- Known-risk test addresses: pinned in Intercepta's ETHGlobal Discord channel

---

## 4. (Fallback) Curvegrid – 🤖 Best AI Agent Project – $1,000

Sponsor total: $3,000.

**Prize split**
- $1,000 (single prize, no placement split listed)

**Description (what they want)**

What happens when AI agents can understand blockchain activity and take action on-chain?

AI agents are emerging as a new interface for interacting with financial infrastructure. Combined with programmable digital assets, they could help users analyze portfolios, automate treasury operations, execute payments, monitor risks, interact with smart contracts, and coordinate increasingly complex workflows.

Ideas to explore:
- 💰 AI Treasury Agent — Monitor digital assets and recommend actions based on balances, liquidity needs, or predefined policies.
- 🪙 Stablecoin Payment Agent — Manage invoices, initiate stablecoin payments, select payment routes, or track settlement.
- 🔎 On-Chain Monitoring Agent — Analyze wallets, contracts, or transactions and surface unusual activity or events requiring attention.
- 📊 Portfolio Intelligence Agent — Let users ask natural-language questions about holdings, transactions, yield, or historical activity.
- 🛡️ Policy-Aware Transaction Agent — Propose or execute transactions while respecting rules such as spending limits, approved counterparties, or required human approvals.
- 🤝 Agent-to-Agent Payments — Explore autonomous commerce where AI agents request, execute, or reconcile on-chain payments with one another.

Using their blockchain development platform MultiBaas is not a requirement to apply for this prize.

**Qualification requirements**
- [ ] A GitHub repository with your project artifacts (contracts, tests, documentation) and a solid README.
- [ ] README includes 1️⃣ a one-sentence summary of your project
- [ ] README includes 2️⃣ how you used MultiBaas in your project (optional)
- [ ] README includes 3️⃣ a brief intro to your team and their social handles
- [ ] README includes 4️⃣ clear setup and testing instructions
- [ ] README includes 5️⃣ your experience with MultiBaas if you used it (feedback, challenges, wins)

**Judging criteria**
- "Judging is based on your idea and technical execution."

**Submission deliverables**
- [ ] GitHub repo with contracts, tests, documentation
- [ ] README with items 1–5 above (2 and 5 only if MultiBaas used)

**Links and resources**
- Curvegrid Docs: https://docs.curvegrid.com/
- Curvegrid Website: https://www.curvegrid.com
- Workshop: "Stablecoins, AI Agents, and the Future of On-..." (uses Curvegrid's Matsuri Stablecoin Sample App) – 04:00 PM JST, Fri Sep 25 2026, 5F Workshop Room (video on prize page)

---

## General ETHGlobal submission rules

**Deadline and submission**
- [ ] Submit by **Sunday, September 27th 2026 at 09:00 am JST**. Late submissions won't be accepted.
- [ ] Submit via Hacker Dashboard: project title, description, link to repository.
- [ ] Choose submission type: (1) Finalist and Partner Prizes (requires presenting live at Finalist judging session) or (2) Partner Prizes Only.
- [ ] Submitting a project (even partial/incomplete) before the deadline is required to get the stake back; must also have checked in and been physically present.

**Partner prizes**
- [ ] Select **up to 3 Partner Prizes** on the last step of the submission form. If a partner has multiple tracks, you can be eligible for all of them while counting as only 1 Partner Prize. Selection is "the only way for partners to assess your project".
- [ ] For each selected partner prize: explain how you've used or integrated their tools, provide feedback, and share relevant comments (in the submission form).
- [ ] Partners judge from submission materials; presenting at partner booths is optional (feedback/networking). Winners announced at closing ceremony. Check partner-specific rules for additional requirements.
- NOTE: ENS + World + Intercepta = all 3 slots. Using the Curvegrid fallback means dropping one of them.

**Demo video (optional but strongly encouraged; featured on the ETHGlobal Showcase)**
- [ ] Between 2 and 4 minutes (under 2 or over 4 is automatically rejected on upload)
- [ ] At least 720p (upload fails below 720p)
- [ ] Do NOT speed up the video to fit the time limit
- [ ] Do NOT use music with on-screen text instead of talking
- [ ] Do NOT record with a mobile phone
- [ ] Do NOT use text-to-speech / AI voiceover
- [ ] Speak clearly, not rushed; avoid background noise/echo
- [ ] Intro/backstory ≤ 20 seconds
- [ ] Show the project in action; edit out waiting
- [ ] Slides: no more than 4 bullet points per slide

**Pre-existing work / version control**
- [ ] Classic "From Scratch" track: all project-specific work begins after hacking starts; public libraries / starter kits allowed but be transparent. Pre-existing project work makes you ineligible for partner prizes and Finalist.
- [ ] Use version control throughout the event; large single commits or missing history may be disqualified ("assumed to be unqualified unless proven otherwise").
- [ ] Include everything (GitHub repo, Figma files or equivalent) proving work was done during the hackathon; clearly distinguish new vs reused.
- [ ] Disclose any pre-existing work in writing and in the submission (repo history, video, description).

**Use of AI tools**
- [ ] Attribution: document in the submission where and how AI tools were used (which parts of code, specific files, or assets were generated/assisted by AI).
- [ ] Involvement: AI must assist, not create the entire project; fully AI-built submissions may be ineligible for partner prizes / finalist.
- [ ] Spec-driven development (OpenSpec, Kiro, spec-kit, etc.) is permitted, but you must include all spec files, prompts, and planning artifacts in the submission repository.

**Finalist judging (only if option 1 chosen)**
- 7 minutes per team: 4 min demo + 3 min Q&A. Prepare: what inspired the project, what tools and why, what challenges and how solved.
- Criteria: Technicality, Originality, Practicality, Usability (UI/UX/DX), WOW Factor.

**Team**
- Up to 5 people per team; each member must be accepted and stake individually.

---

## Easy to miss

- [ ] **Partner prize cap is 3.** Our three targets use every slot; Curvegrid fallback requires swapping one out. Select only the Classic-track prizes, not the Continuity-only variants from the same sponsors.
- [ ] **Per-prize text in the submission form:** for each selected partner, explain how their tool is used + feedback + comments.
- [ ] **Intercepta README must point to the exact files where the Intercepta API is called.**
- [ ] **Intercepta README must include 3–5 lines of API feedback** (time to first call, what confused you, what was missing).
- [ ] **Intercepta: screen real mainnet addresses** even if the payment runs on testnet; responses must be live, never mocked or hard-coded. Known-risk test addresses are pinned in their Discord.
- [ ] **Intercepta demo: one payment passes and one is blocked/held, with the reason visible.**
- [ ] **World integration debrief** with all four points: time to first success, friction, missing capability/docs, single biggest improvement (put it in README and the submission form).
- [ ] **World: demo the failure path** (denied/expired/cancelled) where the protected agent action does not happen.
- [ ] **World: validate in the backend**; no client secrets in the frontend; client response alone is never authorization. Must use the event's dev environment (sandbox.auth.world.org).
- [ ] **ENS: showcase must include a live demo link** (deployed and reachable), code open source, no hard-coded values, ENSv2 on Sepolia central to the product.
- [ ] **AI tool attribution** in the submission, listing which files/parts were AI-assisted, **and all spec/prompt/planning artifacts committed to the repo** (e.g. this `notes/` folder).
- [ ] **Commit history** spread over the event: no single giant final commit.
- [ ] **Demo video 2–4 min, ≥720p, human voice** (no AI voiceover, no speed-up, no phone recording, no music-plus-captions).
- [ ] **Deadline: Sun 27 Sep 2026, 09:00 JST.**
- [ ] (Curvegrid fallback only) README needs a one-sentence summary, team intro with social handles, and setup + testing instructions.
