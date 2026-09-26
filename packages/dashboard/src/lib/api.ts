import type { ActivityResponse, ChatHistory, ChatResponse, PolicyResponse } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `Request to ${path} failed (${response.status})`);
  return body as T;
}

export const api = {
  policy: () => request<PolicyResponse>("/api/policy"),
  pollActivity: () => request<ActivityResponse>("/api/approvals/poll", { method: "POST" }),
  chat: (history: ChatHistory, message: string) =>
    request<ChatResponse>("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history, message }),
    }),
};
