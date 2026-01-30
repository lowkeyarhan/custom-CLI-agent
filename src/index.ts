#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'path';
import { Agent } from './agent.js';
import type { AgentConfig } from './types.js';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('arhan')
  .description('Arhan - AI Coding Agent CLI')
  .version('1.0.0');

program
  .argument('[task]', 'The coding task to perform')
  .option('-y, --yes', 'Auto-approve all tool executions', false)
  .option('-m, --model <model>', 'OpenRouter model to use', process.env.OPENROUTER_MODEL || 'google/gemini-flash-1.5')
  .option('--max-iterations <number>', 'Maximum iterations', '20')
  .option('--clear', 'Clear conversation history', false)
  .option('--history <file>', 'Conversation history file', '.arhan_history.json')
  .action(async (task: string | undefined, options) => {
    try {
      // Check for API key
      if (!process.env.OPENROUTER_API_KEY) {
        console.error(chalk.red('❌ Error: OPENROUTER_API_KEY environment variable is required'));
        console.log(chalk.yellow('\nGet your API key from: https://openrouter.ai/keys'));
        console.log(chalk.dim('Then set it in your .env file or export it:'));
        console.log(chalk.dim('  export OPENROUTER_API_KEY=your_key_here'));
        process.exit(1);
      }

      const config: AgentConfig = {
        model: options.model,
        autoApprove: options.yes,
        maxIterations: parseInt(options.maxIterations, 10),
        conversationFile: path.resolve(process.cwd(), options.history)
      };

      const agent = new Agent(config);
      await agent.initialize();

      // Clear history if requested
      if (options.clear) {
        await agent.clearHistory();
        if (!task) {
          return;
        }
      }

      // Show welcome message
      console.log(chalk.bold.cyan('\n🤖 Arhan - AI Coding Agent'));
      console.log(chalk.dim(`Model: ${config.model}`));
      console.log(chalk.dim(`History: ${config.conversationFile}`));
      console.log();

      // If no task provided, show usage
      if (!task) {
        console.log(chalk.yellow('No task provided. Usage:'));
        console.log(chalk.dim('  arhan "your task here"'));
        console.log(chalk.dim('  arhan "fix the bug in index.js"'));
        console.log(chalk.dim('  arhan "add error handling to the API"'));
        console.log();
        return;
      }

      // Run the agent
      console.log(chalk.bold('Task:'), task);
      console.log();
      
      await agent.run(task);
      
      console.log();
      console.log(chalk.green('✅ Task completed'));
      console.log(chalk.dim('\nHistory saved to:'), config.conversationFile);

    } catch (error) {
      console.error(chalk.red('\n❌ Fatal error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
