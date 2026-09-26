#!/usr/bin/env bun
import { WorldApprovalClient } from "../../packages/agent/src/world-approval";

const client = new WorldApprovalClient(process.env.WORLD_CLIENT_ID ?? "", process.env.WORLD_CLIENT_SECRET ?? "");
const expectedApprover = process.env.WORLD_APPROVER_SUB;

const authorization = await client.startApproval();
console.log("Approve or deny here:", authorization.verification_uri_complete);
console.log("Code:", authorization.user_code, `(expires in ${authorization.expires_in}s)`);

let intervalSeconds = authorization.interval;
while (true) {
  await Bun.sleep(intervalSeconds * 1000);
  const result = await client.poll(authorization.device_code);
  if (result.status === "pending") continue;
  if (result.status === "slow_down") {
    intervalSeconds += 5;
    continue;
  }
  if (result.status !== "approved") {
    console.log(`Not approved: ${result.status} (${result.error}). Payment would be dropped.`);
    console.log("\nSPIKE 4 PASS (non-approval path)");
    break;
  }

  console.log("Validated id_token. Approver sub:", result.approverSub, "auth_time:", result.authTime);
  if (!expectedApprover) {
    console.log("Enrollment run: save this as WORLD_APPROVER_SUB in .env and omamori.approver in ENS.");
  } else if (result.approverSub !== expectedApprover) {
    console.log("Approved by someone other than the ENS approver. Payment would be refused.");
  }
  console.log("\nSPIKE 4 PASS (approval path)");
  break;
}
