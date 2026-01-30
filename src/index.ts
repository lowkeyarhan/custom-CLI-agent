#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import dotenv from "dotenv";
import path from "path";
import os from "os";
import readline from "readline";
import { Agent } from "./agent.js";
import type { AgentConfig } from "./types.js";
import { UI } from "./ui.js";

dotenv.config({ path: path.join(os.homedir(), ".lowkeyarhan", ".env") });
dotenv.config({ override: true });

const program = new Command();
program
  .name("lowkeyarhan")
  .description("lowkeyarhan - AI Coding Agent CLI")
  .version("1.0.0");
program
  .argument("[task]", "The coding task to perform")
  .option("-y, --yes", "Auto-approve all tool executions", false)
  .option(
    "-m, --model <model>",
    "OpenRouter model to use",
    process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-exp:free",
  )
  .option("--max-iterations <number>", "Maximum iterations", "20")
  .option("--clear", "Clear conversation history", false)
  .option(
    "--history <file>",
    "Conversation history file",
    ".arhan_history.json",
  )
  .action(async (task: string | undefined, options) => {
    try {
      if (!process.env.OPENROUTER_API_KEY) {
        console.error(
          chalk.red(
            "\u2718 Error: OPENROUTER_API_KEY environment variable is required",
          ),
        );
        console.log(
          chalk.yellow("\nGet your API key from: https://openrouter.ai/keys"),
        );
        console.log(chalk.dim("Then set it in your .env file or export it:"));
        console.log(chalk.dim("  export OPENROUTER_API_KEY=your_key_here"));
        process.exit(1);
      }
      const config: AgentConfig = {
        model: options.model,
        autoApprove: options.yes,
        maxIterations: parseInt(options.maxIterations, 10),
        conversationFile: path.resolve(process.cwd(), options.history),
      };
      const agent = new Agent(config);
      await agent.initialize();
      if (options.clear) {
        await agent.clearHistory();
        if (!task) {
          return;
        }
      }
      UI.welcome();
      const modelName = config.model.split("/").pop() || config.model;
      UI.info(`Model: ${modelName}`);
      UI.info(`Auto-approve: ${config.autoApprove ? "enabled" : "disabled"}`);
      console.log();
      if (!task) {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        return new Promise<void>((resolve) => {
          rl.question(UI.prompt(), async (userTask: string) => {
            rl.close();
            if (!userTask.trim()) {
              console.log();
              console.log(chalk.hex("#808080")("  No task entered. Exiting."));
              console.log();
              resolve();
              return;
            }
            UI.taskStart(userTask.trim());
            await agent.run(userTask.trim());
            UI.complete();
            resolve();
          });
        });
      }
      UI.taskStart(task);
      await agent.run(task);
      UI.complete();
    } catch (error) {
      UI.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
program.parse();
