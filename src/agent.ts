import OpenAI from "openai";
import inquirer from "inquirer";
import ora, { Ora } from "ora";
import type { AgentConfig, Message, ToolCall } from "./types.js";
import { tools, executeTool } from "./tools.js";
import { HistoryManager } from "./history.js";
import { UI } from "./ui.js";

const SYSTEM_PROMPT = `You are lowkeyarhan, an autonomous coding agent running in the terminal.

## Tools Available

- **read_file(path)** — Read a file's contents
- **write_file(path, content)** — Create or overwrite a file
- **list_files(path, recursive?, depth?)** — List directory contents
- **run_command(command, cwd?)** — Execute a shell command
- **fetch_url(url, format?, extract_css?)** — Fetch a webpage. Use format="html" 
  when cloning sites (preserves structure). Use extract_css=true to get styles too.
- **search_web(query, max_results?)** — Search DuckDuckGo, returns URLs + snippets

## Rules

1. When the user provides a URL, immediately call fetch_url on it before doing 
   anything else.
2. When cloning a website: fetch_url first with format="html", study the structure 
   (sections, class names, colour scheme, fonts, layout), then build a faithful 
   reproduction as a single self-contained .html file with embedded CSS and JS.
3. Always verify your work: after writing a file, read it back or run a command 
   to confirm it was written correctly.
4. Never describe what you're going to do — just do it with tool calls.
5. Complete tasks fully. Do not stop and ask for confirmation mid-task.
6. For shell commands that build or test code, always check the exit code / output.`;

export class Agent {
  private client!: OpenAI;
  private config: AgentConfig;
  private history: HistoryManager;
  private spinner: Ora | null = null;
  private provider: string;

  private sessionInputTokens = 0;
  private sessionOutputTokens = 0;
  private sessionIterations = 0;
  private sessionTotalMs = 0;

  constructor(config: AgentConfig) {
    this.config = config;

    this.provider = process.env.PROVIDER || "openrouter";
    this.initClient();
    this.history = new HistoryManager(config.conversationFile);
  }

  public updateConfig(config: AgentConfig, provider?: string) {
    this.config = config;
    if (provider) {
      this.provider = provider;
    }
    this.initClient();
  }

  private initClient() {
    const providerConfigs: Record<string, { baseURL: string; apiKey: string }> =
      {
        openrouter: {
          baseURL: "https://openrouter.ai/api/v1",
          apiKey: process.env.OPENROUTER_API_KEY || "",
        },
        openai: {
          baseURL: "https://api.openai.com/v1",
          apiKey: process.env.OPENAI_API_KEY || "",
        },
        anthropic: {
          baseURL: "https://api.anthropic.com/v1",
          apiKey: process.env.ANTHROPIC_API_KEY || "",
        },
        google: {
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
          apiKey: process.env.GOOGLE_API_KEY || "",
        },
        custom: {
          baseURL: process.env.CUSTOM_BASE_URL || "http://localhost:11434/v1",
          apiKey: process.env.CUSTOM_API_KEY || "ollama",
        },
      };

    const providerConfig =
      providerConfigs[this.provider] || providerConfigs.openrouter;

    if (!providerConfig.apiKey) {
      throw new Error(
        `No API key found for provider "${this.provider}". Run 'lowkeyarhan --setup' to configure.`,
      );
    }

    this.client = new OpenAI({
      baseURL: providerConfig.baseURL,
      apiKey: providerConfig.apiKey,
      defaultHeaders:
        this.provider === "openrouter"
          ? {
              "HTTP-Referer": process.env.APP_URL || "http://localhost",
              "X-Title": process.env.APP_NAME || "lowkeyarhan",
            }
          : {},
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
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const foundUrls = userMessage.match(urlRegex);

    if (foundUrls && foundUrls.length > 0) {
      userMessage += `\n\n[URLs detected in message: ${foundUrls.join(", ")}. Use fetch_url to read these pages before responding.]`;
    }

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

    if (iterations >= this.config.maxIterations) {
      UI.maxIterations();
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
    let firstTokenTime: number | null = null;
    let currentMaxTokens = 4096;

    let stream;

    try {
      try {
        stream = await this.client.chat.completions.create({
          model: this.config.model,
          messages: messages as any,
          tools: tools.map((t) => ({ type: "function" as const, function: t })),
          stream: true,
          temperature: 0.7,
          max_tokens: currentMaxTokens,
          stream_options: { include_usage: true },
        });
      } catch (err: any) {
        const errStr = String(err);
        if (
          errStr.includes("400") &&
          (errStr.toLowerCase().includes("max_tokens") ||
            errStr.toLowerCase().includes("context length"))
        ) {
          stream = await this.client.chat.completions.create({
            model: this.config.model,
            messages: messages as any,
            tools: tools.map((t) => ({
              type: "function" as const,
              function: t,
            })),
            stream: true,
            temperature: 0.7,
            max_tokens: 2048,
            stream_options: { include_usage: true },
          });
        } else {
          throw err;
        }
      }
    } catch (error: any) {
      if (this.spinner?.isSpinning) this.spinner.stop();
      let errorMessage =
        error?.response?.data?.error?.message ||
        error?.message ||
        String(error);
      throw new Error(`API error: ${errorMessage}`);
    }

    let assistantMessage = "";
    let toolCalls: ToolCall[] = [];

    let hasShownThinking = false;
    let usageData: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
      reasoning_tokens?: number;
    } | null = null;

    this.spinner = ora({
      text: "Thinking",
      color: "green",
      spinner: "dots",
    }).start();

    try {
      for await (const chunk of stream) {
        if (chunk.usage && chunk.usage.total_tokens) {
          usageData = chunk.usage;
        }

        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          if (!firstTokenTime && delta.content.trim()) {
            firstTokenTime = Date.now();
          }

          if (!hasShownThinking && delta.content.trim()) {
            this.spinner?.stop();
            this.spinner?.clear();
            hasShownThinking = true;
          }

          UI.streamContent(delta.content);
          assistantMessage += delta.content;
        }

        if (delta?.tool_calls) {
          if (!hasShownThinking) {
            this.spinner?.stop();
            this.spinner?.clear();
            hasShownThinking = true;
          }
          if (!firstTokenTime) {
            firstTokenTime = Date.now();
          }

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
      if (this.spinner?.isSpinning) {
        this.spinner.stop();
        this.spinner.clear();
      }
      throw new Error(`Stream Error: ${streamError.message}`);
    }

    if (this.spinner?.isSpinning) {
      this.spinner.stop();
      this.spinner.clear();
    }

    if (assistantMessage) {
      UI.streamComplete();
    }

    const iterationEndTime = Date.now();
    const totalTime = iterationEndTime - iterationStartTime;
    const ttft = firstTokenTime ? firstTokenTime - iterationStartTime : null;

    this.sessionTotalMs += totalTime;

    if (usageData) {
      if (usageData.prompt_tokens)
        this.sessionInputTokens += usageData.prompt_tokens;
      if (usageData.completion_tokens)
        this.sessionOutputTokens += usageData.completion_tokens;
    }

    if (usageData || ttft !== null) {
      UI.usageStats({
        inputTokens: usageData?.prompt_tokens ?? null,
        outputTokens: usageData?.completion_tokens ?? null,
        reasoningTokens: usageData?.reasoning_tokens ?? null,
        ttftMs: ttft,
        totalMs: totalTime,
      });
    }

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
      return true; // Continue after tools
    }

    return false; // End
  }

  private async executeToolCall(toolCall: ToolCall): Promise<void> {
    const { name, arguments: argsStr } = toolCall.function;

    let args: Record<string, any>;
    try {
      args = JSON.parse(argsStr);
    } catch (error) {
      UI.toolCallStart(name, {});
      UI.toolCallResult(
        false,
        "",
        `Failed to parse tool arguments: ${argsStr}`,
        name,
        {},
      );
      this.history.addMessage({
        role: "tool",
        tool_call_id: toolCall.id,
        content: `Failed to parse arguments: ${argsStr}`,
      });
      return;
    }

    const needsConf = await this.needsConfirmation(name, args);
    if (!needsConf || this.config.autoApprove) {
      UI.toolCallStart(name, args);
    }

    if (needsConf && !this.config.autoApprove) {
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
          content: "Cancelled",
        });
        return;
      }

      UI.toolCallStart(name, args);
    }

    const result = await executeTool(name, args);

    UI.toolCallResult(result.success, result.output, result.error, name, args);

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
    _args: Record<string, any>,
  ): Promise<boolean> {
    if (toolName === "write_file" || toolName === "run_command") return true;
    if (toolName === "fetch_url" || toolName === "search_web") return false; // read-only
    return false;
  }

  async clearHistory(): Promise<void> {
    await this.history.clearFile();
    this.history.addMessage({ role: "system", content: SYSTEM_PROMPT });
    await this.history.save();
    UI.info("\u2713 Conversation history cleared");
  }
}
