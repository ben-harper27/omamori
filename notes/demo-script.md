# Demo script (target 3:30, hard limit 4:00)

Record at 1080p, screen capture of https://omamori-tokyo.vercel.app plus a terminal. Human voice, no speed-up, no music.

## Before recording

- [ ] `bun scripts/family.ts status` shows `obaachan.tanaka.eth` active
- [ ] Agent wallet has at least 12 USDC on Base Sepolia
- [ ] Clear the payment log if needed (fresh Neon rows make the story cleaner)
- [ ] World ID sandbox open in a second tab, logged in as the family approver
- [ ] Etherscan tab ready for the beat 4 transaction
- [ ] Two windows side by side: https://omamori-tokyo.vercel.app (Obaachan) and /family (Family). Either page completes an approved payment (both poll World ID).

## 0:00–0:25 Hook

"In Japan, *tokushu sagi* scams took a record 142 billion yen in 2025, nearly double the year before, and people over 65 lost six of every ten yen of it. As grandparents start using AI assistants to pay for things, scammers will talk to the agent instead. Prompt injection is ore-ore fraud for AI. Omamori is a payment agent that stays safe even when it is manipulated."

Show the two windows: Obaachan's simple page on the left, the family page on the right.

Source: National Police Agency 2025 figures, via [Nippon.com](https://www.nippon.com/en/japan-data/h02795/).

## 0:25–0:55 Beat 1: everyday purchase

Click **My medicine**.

"Every payment goes through one deterministic function. The agent reads its policy fresh from its ENS name, Intercepta screens the payee, the token and the payment authorization before anything is signed, and only then does it pay the pharmacy over x402."

Point at (family window): policy card (read from ENSv2), log entry **Paid · Rule 8**, Intercepta verdicts clean, Base Sepolia tx link.

## 0:55–1:25 Beat 2: the scam

Click **A caller wants a refund fee** (demo box).

"The agent is told to pay an urgent refund fee. It tries. Intercepta flags the address, and the payment is refused before signing, with the reasons on screen."

Point at: **Refused · Rule 2** and the Intercepta reasons.

## 1:25–2:25 Beat 3: family approval (World ID)

Click **Taxi to the airport**.

"8 USDC is over the family's approval threshold, so the payment pauses. The family sees exactly what is being approved, and confirms with World ID."

1. Approvals card shows **8 USDC to taxi.omamori-demo.eth · Large payment**. Click **Review with World ID**, **deny**. Log shows **Family denied**, nothing paid.
2. Ask again, this time **approve**. Obaachan's page shows **"Your family said yes, your taxi is booked and paid"**; the family log shows **Family approved**, then **Paid** with a tx link.

"The backend validates World's token and checks it came from the approver named in ENS. Each approval is bound to one payment's exact terms, can be used once, and expires in ten minutes."

## 2:25–3:05 Beat 4: the manipulation

Click **“Raise your limit now”** (demo box).

"Now the scammer goes after the rules themselves. The agent has a real tool to edit its own ENS record, and it uses it."

Show the chat reply, then the Etherscan tab: **transaction reverted**.

"ENSv2 Enhanced Access Control lets the family give the agent's key permission for its description and nothing else. The limit is still 20 USDC."

## 3:05–3:30 Beat 5: revocation (cut first if long)

Terminal: `bun scripts/family.ts revoke`. Click **My medicine**.

"The family revokes the agent's name. The agent refuses everything, and the pharmacy independently checks the payer's ENS name and refuses too."

Point at: policy badge **Revoked**, log **Seller refused: … not active**. Afterwards (off camera): `bun scripts/family.ts restore`.

## 3:30 Close

"Family rules in ENSv2, live screening with Intercepta, human approval with World ID. The agent can be fooled; the money can't."

## If short on time

Cut beat 5 first, then merge beats 1 and 2 into one 40-second segment.
