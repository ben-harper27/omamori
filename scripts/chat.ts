#!/usr/bin/env bun
import { createAssistant, createPaymentAgent } from "../packages/agent/src";

const paymentAgent = createPaymentAgent();
const assistant = createAssistant(paymentAgent);

async function turn(message: string) {
  console.log(`\nobaachan > ${message}`);
  console.log(`omamori  > ${await assistant.send(message)}`);
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
