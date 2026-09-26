import { createAssistant, type ChatHistory } from "@omamori/agent";
import { errorResponse, getPaymentAgent, jsonResponse } from "@/lib/server/omamori";

type ChatRequest = { history?: unknown; message?: unknown };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ChatRequest;
  if (typeof body.message !== "string" || !body.message.trim()) return errorResponse(new Error("message is required"), 400);
  if (body.history !== undefined && !Array.isArray(body.history)) return errorResponse(new Error("history must be an array"), 400);

  try {
    const assistant = createAssistant(await getPaymentAgent(), new URL(request.url).origin);
    const result = await assistant.send((body.history ?? []) as ChatHistory, body.message.trim());
    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
