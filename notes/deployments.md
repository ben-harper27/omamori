# Deployments and test wallets

Private keys live in `.env` only.

| Role | Address | Needs |
| --- | --- | --- |
| Family (ENS owner, approver) | 0x5E55569803EC5E85dBc466EB94c4AdD8e372475d | Sepolia ETH |
| Agent (payer, ENS subname addr) | 0x4F2F35d637209f38c11D35370Fc1F5419e3cacE1 | Sepolia ETH (for beat 4 tx), Base Sepolia USDC |
| Seller payTo | 0x8c8d0d29b1b62a8C1710A789116da5115b707616 | nothing |

## ENSv2 (Sepolia)

## x402

- Protocol v2, packages `@x402/*` 2.27.0 (not the legacy `x402-*` v1 packages)
- Network `eip155:84532` (Base Sepolia), facilitator `https://x402.org/facilitator` (no key; pays gas)
- USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (EIP-712 domain name `USDC`, version `2`)
- Buyer hook: `client.onBeforePaymentCreation` returning `{ abort: true }` refuses before signing
- x402 client has its own default spend cap of $1 per payment; raise with `client.setSpendControls` for the 8 USDC taxi


## World ID for Agents (sandbox)

- Client registered, auth `client_secret_basic`, redirect `https://omamori-tokyo.vercel.app/auth/world/callback` (sector for pairwise `sub`)
- Family approver sub: `QMFCRPDOALRZ2ZGNRMO6IB4M2GDLLFCMZZ3JK5AGUSFMBH22LT2A` (goes in `omamori.approver`)
