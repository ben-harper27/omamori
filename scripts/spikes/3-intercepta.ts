#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from "node:fs";
import { privateKeyToAccount } from "viem/accounts";
import { InterceptaClient, addressVerdict, signatureVerdict, tokenVerdict } from "../../packages/shared/src";

const MAINNET_BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const CLEAN_ADDRESS = "0x8c8d0d29b1b62a8C1710A789116da5115b707616";
const RISKY_ADDRESS = (process.env.RISKY_ADDRESS ?? "0x098B716B8Aaf21512996dC57EB0615e2383E2f96") as `0x${string}`;
const FIXTURE_DIR = "packages/shared/src/fixtures";

const client = new InterceptaClient(process.env.INTERCEPTA_API_KEY ?? "");
const payer = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`).address;

function transferAuthorization(to: `0x${string}`) {
  return {
    domain: { name: "USD Coin", version: "2", chainId: 8453, verifyingContract: MAINNET_BASE_USDC },
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization",
    message: { from: payer, to, value: "1000000", validAfter: "0", validBefore: "1790000000", nonce: `0x${"11".repeat(32)}` },
  };
}

function save(name: string, data: unknown) {
  writeFileSync(`${FIXTURE_DIR}/${name}.json`, JSON.stringify(data, null, 2));
}

mkdirSync(FIXTURE_DIR, { recursive: true });

const [cleanScan, riskyScan, tokenScan, cleanSig, riskySig] = await Promise.all([
  client.quickScanAddress(CLEAN_ADDRESS),
  client.quickScanAddress(RISKY_ADDRESS),
  client.scanToken(MAINNET_BASE_USDC, "8453"),
  client.scanTypedData(payer, transferAuthorization(CLEAN_ADDRESS), "8453", "pharmacy.omamori.test"),
  client.scanTypedData(payer, transferAuthorization(RISKY_ADDRESS), "8453", "urgent-refund.omamori.test"),
]);

save("quick-scan-clean", cleanScan);
save("quick-scan-risky", riskyScan);
save("scan-token-usdc-base", tokenScan);
save("scan-message-clean", cleanSig);
save("scan-message-risky", riskySig);

const results = {
  "clean payTo": addressVerdict(cleanScan),
  "risky payTo": addressVerdict(riskyScan),
  "USDC token": tokenVerdict(tokenScan),
  "clean authorization": signatureVerdict(cleanSig),
  "risky authorization": signatureVerdict(riskySig),
};
for (const [label, verdict] of Object.entries(results)) {
  console.log(`${label.padEnd(22)} ${verdict.level.padEnd(8)} ${verdict.reasons.join(" | ")}`);
}

const passed = results["clean payTo"].level === "clean" && results["risky payTo"].level === "high";
console.log(passed ? "\nSPIKE 3 PASS" : "\nSPIKE 3 CHECK: verdicts not as expected, inspect fixtures");
