import { errorResponse, getPaymentAgent, jsonResponse } from "@/lib/server/omamori";
import { publicActivity } from "@/lib/server/activity";

export async function POST() {
  try {
    const agent = await getPaymentAgent();
    await agent.processApprovals();
    return jsonResponse(await publicActivity(agent));
  } catch (error) {
    return errorResponse(error);
  }
}
