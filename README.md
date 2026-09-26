# Omamori

A payment agent for elderly people whose spending rules are set by their family in ENSv2, screened by Intercepta before every signature, and escalated to the family through World ID for Agents. Built at ETHGlobal Tokyo 2026.

Live demo: _TBD_

## How it works

Every payment goes through one deterministic `decide()` function ([packages/shared/src/decide.ts](packages/shared/src/decide.ts)). The LLM can only propose purchases; it has no path to money except through `decide()`.

1. Seller returns x402 payment terms.
2. Agent reads its policy fresh from its ENSv2 subname (`omamori.*` text records), which only the family can edit.
3. Intercepta screens the payTo address, the token and the payment authorization before signing.
4. `decide()` returns pay, refuse, or ask family. Asking the family starts a World ID for Agents approval bound to that one payment.

## ENSv2

- Code: [packages/shared/src/ens.ts](packages/shared/src/ens.ts), [scripts/spikes/1-ensv2.ts](scripts/spikes/1-ensv2.ts)
- Features used: UserRegistry subregistry, per-agent PermissionedResolver, Enhanced Access Control scoped to a single text record key, non-transferable subname, revocation via `unregister`.

## Intercepta

Files calling the API:
- [packages/shared/src/intercepta.ts](packages/shared/src/intercepta.ts): Quick Scan Address, Scan Token, Scan Message, Deep Scan Address
- [scripts/spikes/3-intercepta.ts](scripts/spikes/3-intercepta.ts)

API feedback: _TBD, 3 to 5 lines (see [notes/feedback-intercepta.md](notes/feedback-intercepta.md))_

## World ID for Agents

- Code: [packages/agent/src/world-approval.ts](packages/agent/src/world-approval.ts) (device grant, backend id_token validation), [packages/agent/src/approvals.ts](packages/agent/src/approvals.ts) (single-use, expiring, terms-bound approvals)
- Integration debrief: _TBD (see [notes/feedback-world.md](notes/feedback-world.md))_

## Setup

```bash
bun install
cp .env.example .env
bun test
```

## AI tools

Built with Claude Code from the spec in [notes/spec.md](notes/spec.md). _TBD: per-file attribution._
