import OpenAI from "openai";
import chalk from "chalk";
import ora, { Ora } from "ora";
import inquirer from "inquirer";
import type { AgentConfig, Message, ToolCall } from "./types.js";
import { tools, executeTool } from "./tools.js";
import { HistoryManager } from "./history.js";

const SYSTEM_PROMPT = `You are Arhan, an autonomous AI coding agent running in a terminal.

You have access to these tools:
- read_file: Read file contents
- write_file: Create or modify files
- list_files: List directory contents
- run_command: Execute shell commands

Your goal is to help the user with coding tasks by:
1. Understanding their request
2. Reading relevant files to understand the context
3. Making necessary changes or running commands
4. Verifying your work

IMPORTANT:
- Always explain your reasoning before taking action
- Be thorough but concise
- Use tools step-by-step, don't try to do everything at once
- After making changes, verify they work
- If you're unsure, ask the user for clarification

Remember: You're an autonomous agent, so be proactive but thoughtful.`;

export class Agent {
  private client: OpenAI;
  private config: AgentConfig;
  private spinner: Ora;
  private history: HistoryManager;

  constructor(config: AgentConfig) {
    this.config = config;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is required");
    }

    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      defaultHeaders: {
        "HTTP-Referer": process.env.APP_URL || "http://localhost",
        "X-Title": process.env.APP_NAME || "Arhan CLI",
      },
    });

    this.spinner = ora();
    this.history = new HistoryManager(config.conversationFile);
  }

  async initialize(): Promise<void> {
    await this.history.load();

    // Add system prompt if this is a new conversation
    const messages = this.history.getMessages();
    if (messages.length === 0 || messages[0].role !== "system") {
      this.history.addMessage({
        role: "system",
        content: SYSTEM_PROMPT,
      });
    }
  }

  async run(userMessage: string): Promise<void> {
    // Add user message to history
    this.history.addMessage({
      role: "user",
      content: userMessage,
    });

    let iterations = 0;
    let shouldContinue = true;

    while (shouldContinue && iterations < this.config.maxIterations) {
      iterations++;

      try {
        shouldContinue = await this.executeIteration();
      } catch (error) {
        console.error(
          chalk.red("\n❌ Error:"),
          error instanceof Error ? error.message : String(error),
        );
        shouldContinue = false;
      }

      // Save after each iteration
      await this.history.save();
    }

    if (iterations >= this.config.maxIterations) {
      console.log(chalk.yellow("\n⚠️  Reached maximum iterations limit"));
    }
  }

  private async executeIteration(): Promise<boolean> {
    this.spinner.start(chalk.blue("🤖 Arhan is thinking..."));

    const messages = this.history.getMessages();

    try {
      const stream = await this.client.chat.completions.create({
        model: this.config.model,
        messages: messages as any,
        tools: tools.map((t) => ({ type: "function" as const, function: t })),
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      });

      let assistantMessage = "";
      let toolCalls: ToolCall[] = [];

      this.spinner.stop();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          process.stdout.write(chalk.cyan(delta.content));
          assistantMessage += delta.content;
        }

        if (delta?.tool_calls) {
          for (const toolCallDelta of delta.tool_calls) {
            if (toolCallDelta.index !== undefined) {
              if (!toolCalls[toolCallDelta.index]) {
                toolCalls[toolCallDelta.index] = {
                  id: toolCallDelta.id || "",
                  type: "function",
                  function: {
                    name: "",
                    arguments: "",
                  },
                };
              }

              const tc = toolCalls[toolCallDelta.index];

              if (toolCallDelta.id) tc.id = toolCallDelta.id;
              if (toolCallDelta.function?.name) {
                tc.function.name = toolCallDelta.function.name;
              }
              if (toolCallDelta.function?.arguments) {
                tc.function.arguments += toolCallDelta.function.arguments;
              }
            }
          }
        }
      }

      if (assistantMessage) {
        console.log(); // New line after streaming
      }

      // Save assistant message
      const message: Message = {
        role: "assistant",
        content: assistantMessage || "",
      };

      if (toolCalls.length > 0) {
        message.tool_calls = toolCalls;
      }

      this.history.addMessage(message);

      // Execute tool calls if any
      if (toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          await this.executeToolCall(toolCall);
        }
        return true; // Continue loop
      }

      // No tool calls, conversation is complete
      return false;
    } catch (error) {
      this.spinner.stop();
      throw error;
    }
  }

  private async executeToolCall(toolCall: ToolCall): Promise<void> {
    const { name, arguments: argsStr } = toolCall.function;

    let args: Record<string, any>;
    try {
      args = JSON.parse(argsStr);
    } catch (error) {
      console.error(
        chalk.red(`\n❌ Failed to parse tool arguments: ${argsStr}`),
      );
      return;
    }

    console.log(chalk.blue(`\n🔧 Tool: ${name}`));
    console.log(chalk.dim(JSON.stringify(args, null, 2)));

    // Check if we need user confirmation
    const needsConfirmation = await this.needsConfirmation(name, args);

    if (needsConfirmation && !this.config.autoApprove) {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: chalk.yellow(`Allow ${name}?`),
          default: name === "read_file" || name === "list_files",
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow("❌ Tool execution cancelled by user"));
        this.history.addMessage({
          role: "tool",
          tool_call_id: toolCall.id,
          content: "Tool execution was cancelled by the user",
        });
        return;
      }
    }

    // Execute tool
    this.spinner.start(chalk.dim("Executing..."));
    const result = await executeTool(name, args);
    this.spinner.stop();

    if (result.success) {
      console.log(chalk.green("✅ Success"));
      if (result.output) {
        console.log(chalk.dim(this.truncateOutput(result.output)));
      }
    } else {
      console.log(chalk.red("❌ Error"));
      console.log(chalk.red(result.error || "Unknown error"));
    }

    // Add tool result to history
    this.history.addMessage({
      role: "tool",
      tool_call_id: toolCall.id,
      content: result.success
        ? result.output
        : result.error || "Tool execution failed",
    });
  }

  private async needsConfirmation(
    toolName: string,
    args: Record<string, any>,
  ): Promise<boolean> {
    // Always confirm writes and commands
    if (toolName === "write_file" || toolName === "run_command") {
      return true;
    }

    // Extra confirmation for dangerous operations
    if (toolName === "run_command") {
      const cmd = args.command?.toLowerCase() || "";
      if (
        cmd.includes("rm ") ||
        cmd.includes("delete") ||
        cmd.includes("remove")
      ) {
        return true;
      }
    }

    // Reads and lists don't need confirmation
    return false;
  }

  private truncateOutput(output: string, maxLength: number = 500): string {
    if (output.length <= maxLength) {
      return output;
    }
    return output.substring(0, maxLength) + "\n... (output truncated)";
  }

  async clearHistory(): Promise<void> {
    await this.history.clearFile();
    console.log(chalk.green("✅ Conversation history cleared"));
  }
}
