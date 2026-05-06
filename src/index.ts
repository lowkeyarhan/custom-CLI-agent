#!/usr/bin/env node

import { Command } from "commander";
import { Agent } from "./agent.js";
import { ensureOnboarding } from "./onboarding.js";

const program = new Command();

program
  .name("lowkeyarhan")
  .description("AI Coding Agent CLI")
  .version("1.1.0")
  .option("-m, --model <model>", "Model to use (overrides config)")
  .option("-y, --yes", "Auto-approve all tool calls", false)
  .option("-i, --max-iterations <number>", "Maximum iterations per task", "25")
  .option("-f, --file <file>", "Conversation history file", ".lowkeyarhan-history.json")
  .option("--setup", "Reconfigure provider, API key, and model", false)
  .argument("[task]", "Optional task to start immediately")
  .action(async (task, options) => {
    await ensureOnboarding();

    // If setup was true, ensureOnboarding exists process.

    const config = {
      model: options.model || process.env.OPENROUTER_MODEL || "google/gemini-2.5-pro",
      autoApprove: options.yes,
      maxIterations: parseInt(options.maxIterations, 10),
      conversationFile: options.file,
    };

    const agent = new Agent(config);
    await agent.run(task);
  });

program.parse();
