import OpenAI from "openai";
import type { AgentConfig, Message, ToolCall } from "./types.js";
import { tools, executeTool } from "./tools.js";
import { HistoryManager } from "./history.js";
import { UI } from "./ui.js";

const SYSTEM_PROMPT = `You are lowkeyarhan, an autonomous coding agent running in the terminal.

## Tools Available
- **read_file(path)**: Read a file's contents
- **write_file(path, content)**: Create or overwrite a file
- **list_files(path, recursive?, depth?)**: List directory contents
- **run_command(command, cwd?)**: Execute a shell command
- **fetch_url(url, format?, extract_css?)**: Fetch a webpage.
- **search_web(query, max_results?)**: Search the web using DuckDuckGo

## STRICT RULES - FAILURE TO FOLLOW WILL RESULT IN SYSTEM CRASH
1. **NO CHATTY CODE DUMPS:** NEVER output code blocks or file contents in your text response. YOU MUST ALWAYS use the 'write_file' tool to save code directly to the user's disk. 
2. **MULTI-FILE GENERATION:** If a task requires multiple files, you MUST call 'write_file' for EVERY single file. Do not leave implementation to the user.
3. **ACT, DON'T TALK:** Never describe what you are going to do or provide step-by-step text explanations. Just execute the tool calls.
4. **COMPLETE TASKS FULLY:** Do not stop and ask for confirmation mid-task unless the user must provide specific missing information.
5. **VERIFY YOUR WORK:** After writing files, always read them back or run commands to confirm they are correct and error-free.`;

export class Agent {
  private client!: OpenAI;
  private config: AgentConfig;
  private history: HistoryManager;

  private sessionInputTokens = 0;
  private sessionOutputTokens = 0;
  private sessionIterations = 0;
  private sessionTotalMs = 0;

  constructor(config: AgentConfig) {
    this.config = config;
    this.initClient();
    this.history = new HistoryManager(config.conversationFile);
  }

  public updateConfig(config: AgentConfig) {
    this.config = config;
    this.initClient();
  }

  private initClient() {
    if (!this.config.apiKey || !this.config.baseURL) return;
    this.client = new OpenAI({
      baseURL: this.config.baseURL,
      apiKey: this.config.apiKey,
      defaultHeaders: {
        "HTTP-Referer": process.env.APP_URL || "http://localhost",
        "X-Title": process.env.APP_NAME || "lowkeyarhan",
      },
    });
  }

  async initialize(): Promise<void> {
    await this.history.load();
    const messages = this.history.getMessages();
    if (messages.length === 0 || messages[0].role !== "system") {
      this.history.addMessage({ role: "system", content: SYSTEM_PROMPT });
    }
  }

  async run(userMessage: string): Promise<void> {
    this.history.addMessage({ role: "user", content: userMessage });

    let iterations = 0;
    let shouldContinue = true;

    while (shouldContinue && iterations < this.config.maxIterations) {
      iterations++;
      this.sessionIterations++;

      try {
        shouldContinue = await this.executeIteration();
      } catch (error) {
        UI.error(error instanceof Error ? error.message : String(error));
        shouldContinue = false;
      }
      await this.history.save();
    }

    UI.complete({
      totalInputTokens: this.sessionInputTokens,
      totalOutputTokens: this.sessionOutputTokens,
      iterations: this.sessionIterations,
      totalMs: this.sessionTotalMs,
    });
  }

  private async executeIteration(): Promise<boolean> {
    const messages = this.history.getMessages();
    const iterationStartTime = Date.now();
    let stream;

    try {
      stream = await this.client.chat.completions.create({
        model: this.config.model,
        messages: messages as any,
        tools: tools.map((t) => ({ type: "function" as const, function: t })),
        stream: true,
        stream_options: { include_usage: true },
      });
    } catch (error: any) {
      throw new Error(`API: ${error?.message || "Unknown provider error"}`);
    }

    let assistantMessage = "";
    let toolCalls: ToolCall[] = [];
    let inThinkBlock = false;

    UI.startThinking();

    try {
      for await (const chunk of stream) {
        // Handle Usage Data
        if (chunk.usage) {
          this.sessionInputTokens += chunk.usage.prompt_tokens || 0;
          this.sessionOutputTokens += chunk.usage.completion_tokens || 0;
        }

        const delta = chunk.choices[0]?.delta as any;
        if (!delta) continue;

        // 1. Capture Raw Reasoning (OpenRouter/Claude/DeepSeek support)
        if (delta.reasoning) {
          UI.streamReasoning(delta.reasoning);
        }

        // 2. Handle Text Content and <think> tags
        if (delta.content) {
          let content = delta.content;

          // Manual <think> tag parsing for models that don't support reasoning field
          if (content.includes("<think>")) {
            inThinkBlock = true;
            content = content.replace("<think>", "");
          }

          if (content.includes("</think>")) {
            inThinkBlock = false;
            const parts = content.split("</think>");
            UI.streamReasoning(parts[0]);
            UI.streamContent(parts[1]);
            assistantMessage += parts[1];
            continue;
          }

          if (inThinkBlock) {
            UI.streamReasoning(content);
          } else {
            UI.streamContent(content);
            assistantMessage += content;
          }
        }

        // 3. Aggregate Tool Calls
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index;
            if (!toolCalls[idx]) {
              toolCalls[idx] = {
                id: tc.id || "",
                type: "function",
                function: { name: "", arguments: "" },
              };
            }
            if (tc.id) toolCalls[idx].id = tc.id;
            if (tc.function?.name)
              toolCalls[idx].function.name = tc.function.name;
            if (tc.function?.arguments)
              toolCalls[idx].function.arguments += tc.function.arguments;
          }
        }
      }
    } catch (err: any) {
      UI.stopThinking();
      throw err;
    }

    UI.stopThinking();
    UI.streamComplete();

    const iterationEndTime = Date.now();
    this.sessionTotalMs += iterationEndTime - iterationStartTime;

    const message: Message = {
      role: "assistant",
      content: assistantMessage || "",
    };
    if (toolCalls.length > 0) message.tool_calls = toolCalls;
    this.history.addMessage(message);

    // Execute Tools if any
    if (toolCalls.length > 0) {
      for (const call of toolCalls) {
        await this.executeToolCall(call);
      }
      return true; // Continue to next turn to process tool results
    }

    return false; // Task appears done or just chat response
  }

  private async executeToolCall(toolCall: ToolCall): Promise<void> {
    const { name, arguments: argsStr } = toolCall.function;
    let args: Record<string, any>;

    try {
      args = JSON.parse(argsStr);
    } catch (error) {
      const id = UI.toolCallStart(name, {});
      UI.toolCallResult(
        id,
        false,
        "",
        `Failed to parse tool arguments: ${argsStr}`,
      );
      this.history.addMessage({
        role: "tool",
        tool_call_id: toolCall.id,
        content: "Error: Invalid JSON arguments",
      });
      return;
    }

    // Determine if tool needs user confirmation
    const needsConf = name === "write_file" || name === "run_command";
    const id = UI.toolCallStart(name, args);

    if (needsConf && !this.config.autoApprove) {
      const confirmed = await UI.getConfirmation(name, args);
      if (!confirmed) {
        UI.toolCallResult(id, false, "", "Cancelled by user");
        this.history.addMessage({
          role: "tool",
          tool_call_id: toolCall.id,
          content: "User cancelled this operation.",
        });
        return;
      }
    }

    // Execute the actual logic
    const result = await executeTool(name, args);
    UI.toolCallResult(id, result.success, result.output, result.error);

    this.history.addMessage({
      role: "tool",
      tool_call_id: toolCall.id,
      content: result.success
        ? result.output
        : result.error || "Execution failed",
    });
  }

  async clearHistory(): Promise<void> {
    await this.history.clearFile();
    this.history.addMessage({ role: "system", content: SYSTEM_PROMPT });
    await this.history.save();
  }
}
