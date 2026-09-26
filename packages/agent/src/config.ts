function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set in .env`);
  return value;
}

export const config = {
  sepoliaRpcUrl: required("SEPOLIA_RPC_URL"),
  agentPrivateKey: required("AGENT_PRIVATE_KEY") as `0x${string}`,
  agentName: required("OMAMORI_AGENT_NAME"),
  sellersBaseUrl: process.env.SELLERS_BASE_URL ?? "http://localhost:4021",
  databasePath: process.env.OMAMORI_DB_PATH ?? "data/omamori.sqlite",
  interceptaApiKey: process.env.INTERCEPTA_API_KEY ?? "",
  worldClientId: process.env.WORLD_CLIENT_ID ?? "",
  worldClientSecret: process.env.WORLD_CLIENT_SECRET ?? "",
};
