# Deployments and test wallets

Private keys live in `.env` only.

| Role | Address | Needs |
| --- | --- | --- |
| Family (ENS owner, approver) | 0x5E55569803EC5E85dBc466EB94c4AdD8e372475d | Sepolia ETH |
| Agent (payer, ENS subname addr) | 0x4F2F35d637209f38c11D35370Fc1F5419e3cacE1 | Sepolia ETH (for beat 4 tx), Base Sepolia USDC |
| Seller payTo | 0x8c8d0d29b1b62a8C1710A789116da5115b707616 | nothing |

## ENSv2 (Sepolia)

Live beta addresses are in `packages/shared/src/ens.ts` (source: docs.ens.domains/learn/deployments, NOT contracts-v2 main).

- Spike 1 passed on an anvil fork and on real Sepolia (2026-09-26).

| Item | Value |
| --- | --- |
| Parent name | `tanaka.eth` (owner: family wallet) |
| Agent name | `obaachan.tanaka.eth` (owner: family wallet, non-transferable) |
| tanaka.eth UserRegistry | `0xC28dD6ECE3d1501096751DE84204017566785a40` |
| obaachan PermissionedResolver | `0x89a17b0a44E6864475960Ef88D0726397C87b729` |
| tanaka.eth resolver | `0xbF93540aA6e812b00a8F0263e45677b800b3dB37` |
- Registration is commit/reveal, paid in the public-mint MockUSDC (~8 USDC/yr for 5+ chars).
- Subname is owned by the family with only ROLE_SET_RESOLVER (no CAN_TRANSFER_ADMIN), so transfers revert with `TransferDisallowed`.
- Agent key gets ROLE_SET_TEXT on resource keccak256("description") only, via `grantSetterRoles`.
- Revocation: `userRegistry.unregister(labelhash("obaachan"))` then text records resolve to null.

## x402

- Protocol v2, packages `@x402/*` 2.27.0 (not the legacy `x402-*` v1 packages)
- Network `eip155:84532` (Base Sepolia), facilitator `https://x402.org/facilitator` (no key; pays gas)
- USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (EIP-712 domain name `USDC`, version `2`)
- Buyer hook: `client.onBeforePaymentCreation` returning `{ abort: true }` refuses before signing
- Spike 2 passed live: first settled payment tx `0x165110342abb88c1fd342dfff32bc70b43076feb0608bc45ceb55498f999ed39` (Base Sepolia)
- x402 client has its own default spend cap of $1 per payment; raise with `client.setSpendControls` for the 8 USDC taxi


## World ID for Agents (sandbox)

- Client registered, auth `client_secret_basic`, redirect `https://omamori-tokyo.vercel.app/auth/world/callback` (sector for pairwise `sub`)
- Family approver sub: `QMFCRPDOALRZ2ZGNRMO6IB4M2GDLLFCMZZ3JK5AGUSFMBH22LT2A` (goes in `omamori.approver`)

## Seller names (ENSv2 Sepolia)

Registered by `scripts/setup-sellers.ts` from the family wallet (demo operator). `addr` of each points at the seller payTo.

| Item | Value |
| --- | --- |
| Parent | `omamori-demo.eth` |
| Resolver (shared by all sellers) | `0xAf7a49a188cC0E7376faB1f885a4e7BF8614aFa8` |
| UserRegistry | `0x8841e409AEcC63B5539919A4D87719aaAeCf800f` |
| Sellers | `pharmacy.omamori-demo.eth`, `grocery.omamori-demo.eth`, `taxi.omamori-demo.eth` |
| Scam seller | `refund-desk.eth` — deliberately unregistered, so it always shows as `unverified:` |

`omamori.allowlist` on `obaachan.tanaka.eth` = the three legit seller names.

## Beat 4 proof

Agent key tried to raise `omamori.maxPerPayment` to 999 USDC; reverted onchain: https://sepolia.etherscan.io/tx/0x9d73174846993e7d1e070f5a3584921afd283c907faace638115326ce440369c
