import OpenAI from "openai";
import inquirer from "inquirer";
import ora, { Ora } from "ora";
import type { AgentConfig, Message, ToolCall } from "./types.js";
import { tools, executeTool } from "./tools.js";
import { HistoryManager } from "./history.js";
import { UI } from "./ui.js";

const SYSTEM_PROMPT = `You are lowkeyarhan, an advanced autonomous AI coding agent with exceptional problem-solving and logical reasoning capabilities.

## Your Capabilities
You have access to these tools that you MUST use to complete tasks:
- read_file: Read file contents to understand code structure and context
- write_file: Create or modify files with precise, well-structured code
- list_files: Explore directory structures to understand project layout
- run_command: Execute shell commands to test, build, or verify changes

## Problem-Solving Methodology

### 1. ANALYZE FIRST (Think Before Acting)
- Break down complex tasks into smaller, manageable steps
- Identify what information you need before making changes
- Consider edge cases and potential issues
- Plan your approach logically before executing

### 2. GATHER CONTEXT (Understand the Full Picture)
- Read relevant files to understand the codebase structure
- Check dependencies, imports, and relationships between files
- Understand the existing patterns and conventions
- Identify what needs to change and what should remain unchanged

### 3. REASON LOGICALLY (Apply Systematic Thinking)
- Use deductive reasoning: Start with what you know, derive what you need
- Use inductive reasoning: Observe patterns, form hypotheses, test them
- Consider cause and effect: Understand how changes will impact the system
- Think step-by-step: Each action should logically follow from the previous

### 4. EXECUTE PRECISELY (Take Action)
- Make changes incrementally and verify each step
- Use tools immediately when you need information - don't just describe what you would do
- Test your changes when possible (run commands, check syntax)
- Ensure code quality: proper formatting, error handling, comments where needed

### 5. VERIFY & ITERATE (Ensure Correctness)
- After making changes, verify they work as intended
- Read back modified files to confirm changes are correct
- If something doesn't work, analyze why and fix it
- Continue until the task is fully complete and verified

## Critical Rules

1. **ACT, DON'T DESCRIBE**: When you need information, immediately CALL the tool. Never say "I will use X tool" - just use it.

2. **REASON OUT LOUD**: Briefly explain your thinking process before taking action. This helps you stay focused and logical.

3. **BE THOROUGH**: Don't stop at the first solution. Consider alternatives, edge cases, and improvements.

4. **VERIFY YOUR WORK**: After making changes, always verify they're correct. Read files back, run tests, check outputs.

5. **ITERATE SYSTEMATICALLY**: If the first approach doesn't work, analyze why, adjust your strategy, and try again.

## Workflow Pattern

For any task:
1. **Understand**: What exactly needs to be done? What are the requirements?
2. **Explore**: What files are involved? What's the current state?
3. **Plan**: What steps will achieve the goal? What's the best approach?
4. **Execute**: Make changes incrementally, verifying each step
5. **Verify**: Confirm the solution works and meets all requirements
6. **Complete**: Summarize what was accomplished

## Example Thought Process

Good approach:
"To add error handling, I need to:
1. Read the current file to see the structure
2. Identify where errors might occur
3. Add try-catch blocks or error checks
4. Test the changes
5. Verify the code still works"

Bad approach:
"I will add error handling by reading the file and then modifying it."

Remember: You're a logical problem-solver. Think systematically, act precisely, verify thoroughly.`;

export class Agent {
  private client: OpenAI;
  private config: AgentConfig;
  private history: HistoryManager;
  private spinner: Ora | null = null;

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
    const messages = this.history.getMessages();

    try {
      const stream = await this.client.chat.completions
        .create({
          model: this.config.model,
          messages: messages as any,
          tools: tools.map((t) => ({ type: "function" as const, function: t })),
          stream: true,
          temperature: 0.7,
          max_tokens: 4096,
        })
        .catch((error: any) => {
          // Stop spinner if running
          if (this.spinner?.isSpinning) {
            this.spinner.stop();
          }

          // Extract detailed error information
          let errorMessage = "Unknown error";
          if (error?.response?.data?.error?.message) {
            errorMessage = error.response.data.error.message;
          } else if (error?.message) {
            errorMessage = error.message;
          } else if (typeof error === "string") {
            errorMessage = error;
          }

          // Provide helpful context
          if (
            errorMessage.includes("404") ||
            errorMessage.includes("No endpoints")
          ) {
            errorMessage = `Model "${this.config.model}" not found or unavailable. Try a different model.`;
          } else if (
            errorMessage.includes("401") ||
            errorMessage.includes("Unauthorized")
          ) {
            errorMessage =
              "Invalid API key. Please check your OPENROUTER_API_KEY.";
          } else if (
            errorMessage.includes("429") ||
            errorMessage.includes("rate limit")
          ) {
            errorMessage =
              "Rate limit exceeded. Please wait a moment and try again.";
          } else if (errorMessage.includes("Provider returned error")) {
            errorMessage = `API error: The model provider returned an error. This might be due to:\n    - Model temporarily unavailable\n    - Invalid request format\n    - Try using a different model with -m flag`;
          }

          throw new Error(errorMessage);
        });

      let assistantMessage = "";
      let toolCalls: ToolCall[] = [];
      let hasStartedContent = false;
      let hasShownThinking = false;

      // Start spinner for thinking indicator
      this.spinner = ora({
        text: "Thinking",
        spinner: "dots",
        color: "cyan",
      }).start();

      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;

          if (delta?.content) {
            // Stop spinner and show content when streaming starts
            if (!hasShownThinking && delta.content.trim()) {
              this.spinner?.stop();
              hasShownThinking = true;
            }

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
      } catch (streamError: any) {
        // Stop spinner if running
        if (this.spinner?.isSpinning) {
          this.spinner.stop();
        }

        // Re-throw with better error message
        let errorMessage = streamError?.message || String(streamError);
        if (
          errorMessage.includes("Provider returned error") ||
          errorMessage.includes("provider")
        ) {
          errorMessage = `API error: The model provider returned an error.\n    This might be due to:\n    - Model "${this.config.model}" temporarily unavailable\n    - Invalid request format\n    - Try using a different model: lowkeyarhan -m "google/gemini-2.0-flash-exp:free" "your task"`;
        }
        throw new Error(errorMessage);
      }

      // Stop spinner if it's still running
      if (this.spinner?.isSpinning) {
        this.spinner.stop();
      }

      if (assistantMessage) {
        UI.streamComplete(); // New line after streaming completes
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
        // Silently prompt the agent to actually use the tools (no visible warning)
        this.history.addMessage({
          role: "user",
          content:
            "Please proceed and actually call the tool now. Do not just describe what you will do - execute the tool call.",
        });
        return true; // Continue loop
      }

      // No tool calls and not talking about tools, conversation is complete
      return false;
    } catch (error: any) {
      // Stop spinner if it's still running
      if (this.spinner?.isSpinning) {
        this.spinner.stop();
      }

      // Re-throw with better error message if not already processed
      if (
        error?.message &&
        !error.message.includes("Model") &&
        !error.message.includes("API key")
      ) {
        // Check for common error patterns
        let errorMessage = error.message;

        if (errorMessage.includes("Provider returned error")) {
          errorMessage = `API error: The model provider returned an error.\n    This might be due to:\n    - Model "${this.config.model}" temporarily unavailable\n    - Invalid request format\n    - Try using a different model: lowkeyarhan -m "google/gemini-2.0-flash-exp:free" "your task"`;
        }

        throw new Error(errorMessage);
      }

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

    // Show loading indicator while executing tool
    this.spinner = ora({
      text: `Executing ${this.formatToolName(name)}`,
      spinner: "dots",
      color: "cyan",
    }).start();

    // Execute tool
    const result = await executeTool(name, args);

    // Stop spinner
    this.spinner.stop();

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

  private formatToolName(name: string): string {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
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
    UI.info("\u2713 Conversation history cleared");
  }
}
