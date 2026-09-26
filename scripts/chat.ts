#!/usr/bin/env bun
import { createAssistant, createPaymentAgent, type ChatHistory } from "../packages/agent/src";

const paymentAgent = createPaymentAgent();
const assistant = createAssistant(paymentAgent, process.env.SELLERS_BASE_URL ?? "http://localhost:3000");
let history: ChatHistory = [];

async function turn(message: string) {
  console.log(`\nobaachan > ${message}`);
  const result = await assistant.send(history, message);
  history = result.history;
  console.log(`omamori  > ${result.reply}`);
}

const scripted = process.argv.slice(2);
if (scripted.length > 0) {
  for (const message of scripted) await turn(message);
  process.exit(0);
}

process.stdout.write("Talk to Omamori (Ctrl+D to quit)\n> ");
for await (const line of console) {
  if (line.trim()) await turn(line.trim());
  await paymentAgent.processApprovals();
  process.stdout.write("> ");
}
