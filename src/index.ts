#!/usr/bin/env node

import { Command } from "commander";
import * as readline from "readline";
import chalk from "chalk";
import dotenv from "dotenv";
import path from "path";
import os from "os";
import { Agent } from "./agent.js";
import { ensureOnboarding } from "./onboarding.js";
import { UI } from "./ui.js";

const GLOBAL_ENV_FILE = path.join(os.homedir(), ".lowkeyarhan", ".env");

function loadEnvironment(): void {
  dotenv.config({ path: GLOBAL_ENV_FILE });
  dotenv.config({ override: true });
}

function formatProvider(provider: string): string {
  const providerNames: Record<string, string> = {
    openrouter: "OpenRouter",
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google AI Studio",
    custom: "Custom",
  };

  return providerNames[provider] || provider;
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
  .action(async (task: string | undefined, options) => {
    await ensureOnboarding(options.setup);

    // Onboarding may load the global env file, so re-apply local overrides.
    loadEnvironment();

    const maxIterations = parseInt(options.maxIterations, 10);
    const provider = process.env.PROVIDER || "openrouter";
    const config = {
      model:
        options.model ||
        process.env.OPENROUTER_MODEL ||
        "qwen/qwen-2.5-coder-32b-instruct",
      autoApprove: options.yes as boolean,
      maxIterations: Number.isFinite(maxIterations) ? maxIterations : 25,
      conversationFile: path.resolve(process.cwd(), options.file),
    };

    const agent = new Agent(config);
    await agent.initialize();

    if (options.clear) {
      await agent.clearHistory();
      if (!task) return;
    }

    UI.welcome();
    UI.info(`Provider: ${formatProvider(provider)}`);
    UI.info(`LLM: ${config.model}`);
    UI.info(`Auto-approve: ${config.autoApprove ? "enabled" : "disabled"}`);
    console.log();

    if (!task) {
      function startRepl() {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        rl.on("SIGINT", () => {
          console.log();
          console.log(chalk.hex("#666666")("  Goodbye."));
          console.log();
          rl.close();
          process.exit(0);
        });

        const askForTask = async (): Promise<void> => {
          const userTask = await new Promise<string>((resolve) => {
            rl.question(UI.prompt(), resolve);
          });

          const trimmed = userTask.trim();
          const lower = trimmed.toLowerCase();

          if (
            lower === "exit" ||
            lower === "quit" ||
            lower === "/exit" ||
            lower === "/quit"
          ) {
            console.log();
            console.log(chalk.hex("#666666")("  Goodbye."));
            console.log();
            rl.close();
            return;
          }

          if (!trimmed) {
            return askForTask();
          }

          if (lower === "/help") {
            UI.help();
            return askForTask();
          }

          if (lower === "clear" || lower === "/clear") {
            await agent.clearHistory();
            UI.info("History cleared.");
            console.log();
            return askForTask();
          }

          if (
            lower === "/setup" ||
            lower === "/models" ||
            lower === "/config"
          ) {
            rl.close();
            try {
              await ensureOnboarding(true, false);
              // Reload environment variables and re-initialize the agent context
              loadEnvironment();
              const provider = process.env.PROVIDER || "openrouter";
              const newModel =
                process.env.OPENROUTER_MODEL ||
                "qwen/qwen-2.5-coder-32b-instruct";

              config.model = newModel;
              agent.updateConfig(config, provider);

              UI.info(`Reconfigured Provider: ${formatProvider(provider)}`);
              UI.info(`Reconfigured LLM: ${config.model}`);
              console.log();
              // Start the REPL loop again with a new readline interface
              startRepl();
            } catch (e) {
              UI.error(e instanceof Error ? e.message : String(e));
              startRepl();
            }
            return;
          }

          try {
            UI.taskStart(trimmed);
            await agent.run(trimmed);
          } catch (error) {
            UI.error(error instanceof Error ? error.message : String(error));
          }

          return askForTask();
        };

        return askForTask();
      }

      startRepl();
      return;
    }

    try {
      UI.taskStart(task);
      await agent.run(task);
    } catch (error) {
      UI.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
