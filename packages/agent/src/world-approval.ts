import { createRemoteJWKSet, jwtVerify } from "jose";

const ISSUER = "https://sandbox.auth.world.org";
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));
const DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";

export type DeviceAuthorization = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
};

export type PollResult =
  | { status: "approved"; approverSub: string; authTime: number }
  | { status: "pending" }
  | { status: "slow_down" }
  | { status: "denied" | "expired" | "failed"; error: string };

const TERMINAL_ERRORS: Record<string, "denied" | "expired"> = {
  access_denied: "denied",
  expired_token: "expired",
};

export class WorldApprovalClient {
  private readonly authHeader: string;

  constructor(private readonly clientId: string, clientSecret: string) {
    if (!clientId || !clientSecret) throw new Error("WORLD_CLIENT_ID and WORLD_CLIENT_SECRET must be set");
    this.authHeader = "Basic " + btoa(`${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`);
  }

  private post(path: string, params: Record<string, string>): Promise<Response> {
    return fetch(`${ISSUER}/api/v1/${path}`, {
      method: "POST",
      headers: { Authorization: this.authHeader, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
    });
  }

  async startApproval(): Promise<DeviceAuthorization> {
    const response = await this.post("device_authorization", { scope: "openid" });
    if (!response.ok) throw new Error(`device_authorization failed (${response.status}): ${await response.text()}`);
    return response.json() as Promise<DeviceAuthorization>;
  }

  async poll(deviceCode: string): Promise<PollResult> {
    const response = await this.post("token", { grant_type: DEVICE_GRANT, device_code: deviceCode });
    if (response.status >= 500 || response.status === 429) {
      return { status: "failed", error: `HTTP ${response.status}` };
    }
    const body = (await response.json()) as { id_token?: string; error?: string };
    if (response.ok && body.id_token) {
      const { payload } = await jwtVerify(body.id_token, JWKS, { issuer: ISSUER, audience: this.clientId });
      return { status: "approved", approverSub: payload.sub ?? "", authTime: Number(payload.auth_time) };
    }
    if (body.error === "authorization_pending") return { status: "pending" };
    if (body.error === "slow_down") return { status: "slow_down" };
    const error = body.error ?? "unknown_error";
    return { status: TERMINAL_ERRORS[error] ?? "failed", error };
  }
}
