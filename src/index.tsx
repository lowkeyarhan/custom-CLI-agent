#!/usr/bin/env node
import { Command } from "commander";
import dotenv from "dotenv";
import path from "path";
import os from "os";
import React from "react";
import { render } from "ink";
import { Agent } from "./agent.js";
import { ensureOnboarding } from "./onboarding.js";
import { App } from "./components/App.js";

const GLOBAL_ENV_FILE = path.join(os.homedir(), ".lowkeyarhan", ".env");

function loadEnvironment(): void {
  dotenv.config({ path: GLOBAL_ENV_FILE });
  dotenv.config({ override: true });
}

loadEnvironment();
const program = new Command();

program
  .name("lowkeyarhan")
  .description("AI Coding Agent CLI")
  .version("1.1.0")
  .option("-m, --model <model>", "Model to use (overrides config)")
  .option("-y, --yes", "Auto-approve all tool calls", false)
  .option("-i, --max-iterations <number>", "Maximum iterations per task", "25")
  .option(
    "-f, --file <file>",
    "Conversation history file",
    ".lowkeyarhan-history.json",
  )
  .option("--clear", "Clear conversation history", false)
  .option("--setup", "Reconfigure provider, API key, and model", false)
  .argument("[task]", "Optional task to start immediately")
  .action(async (task: string | undefined, options: Record<string, any>) => {
    await ensureOnboarding(Boolean(options.setup));
    loadEnvironment();

    const maxIterations = parseInt(options.maxIterations, 10);
    const config = {
      baseURL: process.env.BASE_URL || "",
      apiKey: process.env.API_KEY || "",
      model: options.model || process.env.MODEL_ID || "gpt-4o",
      autoApprove: Boolean(options.yes),
      maxIterations: Number.isFinite(maxIterations) ? maxIterations : 25,
      conversationFile: path.resolve(process.cwd(), options.file),
    };

    const agent = new Agent(config);
    await agent.initialize();

    if (options.clear) {
      await agent.clearHistory();
      if (!task) return;
    }

    // Hand over complete control to Ink / React
    render(<App agent={agent} config={config} initialTask={task} />);
  });

program.parse();
