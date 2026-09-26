import { errorResponse, getPaymentAgent, jsonResponse } from "@/lib/server/omamori";
import { publicActivity } from "@/lib/server/activity";

export async function GET() {
  try {
    return jsonResponse(await publicActivity(await getPaymentAgent()));
  } catch (error) {
    return errorResponse(error);
  }
}
