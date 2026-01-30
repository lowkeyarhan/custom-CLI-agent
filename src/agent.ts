import OpenAI from "openai";
import inquirer from "inquirer";
import type { AgentConfig, Message, ToolCall } from "./types.js";
import { tools, executeTool } from "./tools.js";
import { HistoryManager } from "./history.js";
import { UI } from "./ui.js";

const SYSTEM_PROMPT = `You are lowkeyarhan, an autonomous AI coding agent running in a terminal.

You have access to these tools that you MUST use to complete tasks:
- read_file: Read file contents
- write_file: Create or modify files
- list_files: List directory contents
- run_command: Execute shell commands

CRITICAL RULES:
1. When you need information, CALL the appropriate tool - don't just say you will
2. Explain your reasoning briefly, then immediately use the tool
3. After tool results, analyze them and decide on next steps
4. Continue using tools until the task is fully complete
5. Only respond with final text when no more actions are needed

WORKFLOW:
1. Understand the user's request
2. USE tools to gather information or make changes
3. Analyze tool results
4. USE more tools if needed
5. Summarize what you accomplished

Remember: You must actually CALL the tools using function calls, not just describe what you would do.`;

export class Agent {
  private client: OpenAI;
  private config: AgentConfig;
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
        "X-Title": process.env.APP_NAME || "lowkeyarhan",
      },
    });

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
        UI.error(error instanceof Error ? error.message : String(error));
        shouldContinue = false;
      }

      // Save after each iteration
      await this.history.save();
    }

    if (iterations >= this.config.maxIterations) {
      UI.maxIterations();
    }
  }

  private async executeIteration(): Promise<boolean> {
    UI.thinking();

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
      let hasStartedContent = false;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          // Add indentation only at the very start of content
          if (!hasStartedContent && delta.content.trim()) {
            process.stdout.write("  ");
            hasStartedContent = true;
          }
          UI.streamContent(delta.content);
          assistantMessage += delta.content;

          // If content ends with newline, add indentation for next line
          if (delta.content.endsWith("\n")) {
            process.stdout.write("  ");
          }
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
        console.log(); // New line after streaming completes
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

      // Check if the agent is describing tool usage without actually calling them
      const lowerContent = assistantMessage.toLowerCase();
      const mentionsTools =
        lowerContent.includes("list_files") ||
        lowerContent.includes("read_file") ||
        lowerContent.includes("write_file") ||
        lowerContent.includes("run_command") ||
        lowerContent.includes("will use") ||
        lowerContent.includes("i would like to") ||
        lowerContent.includes("my first step");

      if (mentionsTools && toolCalls.length === 0) {
        // Prompt the agent to actually use the tools
        UI.warning(
          "Agent mentioned using tools but did not call them. Prompting to take action...",
        );
        this.history.addMessage({
          role: "user",
          content:
            "Please proceed and actually call the tool now. Do not just describe what you will do - execute the tool call.",
        });
        return true; // Continue loop
      }

      // No tool calls and not talking about tools, conversation is complete
      return false;
    } catch (error) {
      throw error;
    }
  }

  private async executeToolCall(toolCall: ToolCall): Promise<void> {
    const { name, arguments: argsStr } = toolCall.function;

    let args: Record<string, any>;
    try {
      args = JSON.parse(argsStr);
    } catch (error) {
      UI.error(`Failed to parse tool arguments: ${argsStr}`);
      return;
    }

    // Show tool call
    UI.toolCallStart(name, args);

    // Check if we need user confirmation
    const needsConfirmation = await this.needsConfirmation(name, args);

    if (needsConfirmation && !this.config.autoApprove) {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: UI.confirmation(name, args),
          default: name === "read_file" || name === "list_files",
        },
      ]);

      if (!confirm) {
        UI.cancelled();
        this.history.addMessage({
          role: "tool",
          tool_call_id: toolCall.id,
          content: "Tool execution was cancelled by the user",
        });
        return;
      }
    }

    // Execute tool
    const result = await executeTool(name, args);

    // Show result
    UI.toolCallResult(result.success, result.output, result.error);

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

  async clearHistory(): Promise<void> {
    await this.history.clearFile();
    UI.info("✓ Conversation history cleared");
  }
}
