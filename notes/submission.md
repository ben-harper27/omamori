# Submission form text

## One-liner

A payment agent for elderly people whose spending rules are set by their family in ENSv2, screened by Intercepta before every signature, and escalated to the family through World ID, so a scammer who manipulates the agent still can't move the money.

## ENS: Best Use of ENSv2

**How we used it.** The family owns `tanaka.eth` with its own UserRegistry and issues the agent `obaachan.tanaka.eth` with its own PermissionedResolver. The agent's spending policy lives in `omamori.*` text records that the agent reads fresh before every payment. Enhanced Access Control gives the agent's key `ROLE_SET_TEXT` on `description` only, so when a scammer convinces the agent to raise its own limit, the real transaction reverts onchain. The subname is non-transferable (no `ROLE_CAN_TRANSFER_ADMIN`) and revocable via `unregister`; revocation makes the agent refuse everything and sellers refuse the payer. Sellers have ENS names too, and the agent only trusts a seller name whose `addr` matches the payTo. All of it runs on the live ENSv2 beta on Sepolia.

**Feedback.** The contracts-v2 `main` branch didn't match the live Sepolia deployment (older addresses, `authorizeTextRoles` vs `grantSetterRoles`); the docs deployments page and the `deploy/sepolia-migration-20260915` branch were right. `grantRoles` reverting on the PermissionedResolver in favour of `grantSetterRoles` was surprising but elegant once understood. viem's `getEnsText` worked unmodified against the v2 Universal Resolver. Per-key EAC scoping is exactly what agent identities need.

## World: Best Use of World ID for Agents

**How we used it.** When a payment is large or unusual, the agent pauses and creates a World ID for Agents device-grant request. The family member reviews the seller, amount and reason on the dashboard, then approves or denies through World ID. The backend validates the `id_token` against World's JWKS and checks the `sub` equals the approver stored in ENS. Approvals are bound server-side to the hash of one payment's terms, single-use and expire in 10 minutes. Denied, expired and cancelled paths drop the payment.

**Debrief.** See README "World ID for Agents": time to first success, friction, missing capability, biggest improvement.

## Intercepta: Safe Agent-to-Agent Payments with x402

**How we used it.** The paying agent screens the x402 payTo (Quick Scan Address), the token (Scan Token) and the EIP-3009 authorization (Scan Message) live, before signing. High risk refuses the payment, warnings escalate to the family, and screening failures refuse (fail closed). Legit sellers also Deep Scan the payer before accepting. Mainnet risk data is used while payments settle on Base Sepolia.

**Feedback.** See README "Intercepta" (files calling the API and 3–5 lines of feedback).

## AI tools

See README "AI tools". Spec and planning artifacts are in `notes/`.
