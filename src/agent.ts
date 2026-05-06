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
- **search_web(query, max_results?)**: Search the web, returns URLs + snippets

## Rules
1. Never describe what you're going to do - just do it with tool calls.
2. Complete tasks fully. Do not stop and ask for confirmation mid-task.
3. For shell commands that build or test code, always check the exit code / output.`;

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
        temperature: 0.7,
      });
    } catch (error: any) {
      throw new Error(`API error: ${error?.message || String(error)}`);
    }

    let assistantMessage = "";
    let toolCalls: ToolCall[] = [];
    let inThinkBlock = false;

    UI.startThinking();

    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta as any;

        // 1. Handle native OpenRouter reasoning (DeepSeek R1 / Claude 3.7)
        if (delta?.reasoning) {
          UI.streamReasoning(delta.reasoning);
        }

        // 2. Handle embedded <think> tags
        if (delta?.content) {
          let content = delta.content;

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

        if (delta?.tool_calls) {
          for (const toolCallDelta of delta.tool_calls) {
            if (toolCallDelta.index !== undefined) {
              if (!toolCalls[toolCallDelta.index]) {
                toolCalls[toolCallDelta.index] = {
                  id: toolCallDelta.id || "",
                  type: "function",
                  function: { name: "", arguments: "" },
                };
              }
              const tc = toolCalls[toolCallDelta.index];
              if (toolCallDelta.id) tc.id = toolCallDelta.id;
              if (toolCallDelta.function?.name)
                tc.function.name = toolCallDelta.function.name;
              if (toolCallDelta.function?.arguments)
                tc.function.arguments += toolCallDelta.function.arguments;
            }
          }
        }
      }
    } catch (streamError: any) {
      UI.stopThinking();
      throw new Error(`Stream Error: ${streamError.message}`);
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

    if (toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        await this.executeToolCall(toolCall);
      }
      return true;
    }
    return false;
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
        content: `Failed to parse arguments: ${argsStr}`,
      });
      return;
    }

    const needsConf = name === "write_file" || name === "run_command";
    const id = UI.toolCallStart(name, args);

    if (needsConf && !this.config.autoApprove) {
      const confirm = await UI.getConfirmation(name, args);
      if (!confirm) {
        UI.toolCallResult(id, false, "", "Cancelled by user");
        this.history.addMessage({
          role: "tool",
          tool_call_id: toolCall.id,
          content: "Cancelled",
        });
        return;
      }
    }

    const result = await executeTool(name, args);
    UI.toolCallResult(id, result.success, result.output, result.error);
    this.history.addMessage({
      role: "tool",
      tool_call_id: toolCall.id,
      content: result.success
        ? result.output
        : result.error || "Tool execution failed",
    });
  }

  async clearHistory(): Promise<void> {
    await this.history.clearFile();
    this.history.addMessage({ role: "system", content: SYSTEM_PROMPT });
    await this.history.save();
  }
}
