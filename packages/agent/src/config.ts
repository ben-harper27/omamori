function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

// Read lazily so Next.js can build without secrets present.
export function getConfig() {
  return {
    sepoliaRpcUrl: required("SEPOLIA_RPC_URL"),
    agentPrivateKey: required("AGENT_PRIVATE_KEY") as `0x${string}`,
    agentName: required("OMAMORI_AGENT_NAME"),
    databaseUrl: required("DATABASE_URL"),
    interceptaApiKey: process.env.INTERCEPTA_API_KEY ?? "",
    worldClientId: process.env.WORLD_CLIENT_ID ?? "",
    worldClientSecret: process.env.WORLD_CLIENT_SECRET ?? "",
  };
}
