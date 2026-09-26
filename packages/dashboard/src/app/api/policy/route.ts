import { normalize } from "viem/ens";
import { createEnsClient, getConfig } from "@omamori/agent";
import { readPolicy } from "@omamori/shared";
import { errorResponse, jsonResponse } from "@/lib/server/omamori";

export async function GET() {
  try {
    const { agentName } = getConfig();
    const ensClient = createEnsClient();
    const name = normalize(agentName);
    const [policy, agentAddress, resolver, description] = await Promise.all([
      readPolicy(ensClient, name),
      ensClient.getEnsAddress({ name }).catch(() => null),
      ensClient.getEnsResolver({ name }).catch(() => null),
      ensClient.getEnsText({ name, key: "description" }).catch(() => null),
    ]);
    return jsonResponse({ agentName: name, active: policy !== null, policy, agentAddress, resolver, description });
  } catch (error) {
    return errorResponse(error);
  }
}
