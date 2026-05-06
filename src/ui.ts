import { EventEmitter } from "events";
import { SessionStats } from "./types.js";

export type ToolItem = {
  name: string;
  args: any;
  status: "running" | "success" | "error";
  result?: string;
  id: string;
};
export type UIMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; reasoning?: string }
  | { role: "tools"; items: ToolItem[] }
  | { role: "stats"; stats: SessionStats }
  | { role: "error"; content: string }
  | { role: "info"; content: string };

class UIStateManager extends EventEmitter {
  public messages: UIMessage[] = [];
  public currentStream: string = "";
  public currentReasoning: string = "";
  public isThinking: boolean = false;
  public isAwaitingConfirmation: boolean = false;
  public confirmationPrompt: string = "";
  private currentToolGroup: ToolItem[] | null = null;
  private confirmResolve: ((val: boolean) => void) | null = null;

  taskStart(task: string) {
    this.messages.push({ role: "user", content: task });
    this.currentToolGroup = null;
    this.emit("update");
  }

  startThinking() {
    this.isThinking = true;
    this.emit("update");
  }

  stopThinking() {
    this.isThinking = false;
    this.emit("update");
  }

  streamReasoning(content: string) {
    this.currentReasoning += content;
    this.isThinking = true;
    this.emit("update");
  }

  streamContent(content: string) {
    this.currentStream += content;
    this.isThinking = false;
    this.emit("update");
  }

  streamComplete() {
    if (this.currentStream || this.currentReasoning) {
      this.messages.push({
        role: "assistant",
        content: this.currentStream,
        reasoning: this.currentReasoning,
      });
      this.currentStream = "";
      this.currentReasoning = "";
      this.emit("update");
    }
  }

  toolCallStart(
    name: string,
    args: Record<string, any>,
    id: string = Math.random().toString(),
  ) {
    if (!this.currentToolGroup) {
      this.currentToolGroup = [];
      this.messages.push({ role: "tools", items: this.currentToolGroup });
    }
    this.currentToolGroup.push({ name, args, status: "running", id });
    this.emit("update");
    return id;
  }

  toolCallResult(id: string, success: boolean, output: string, error?: string) {
    if (this.currentToolGroup) {
      const tool = this.currentToolGroup.find((t) => t.id === id);
      if (tool) {
        tool.status = success ? "success" : "error";
        tool.result = success ? output : error;
      }
    }
    this.emit("update");
  }

  async getConfirmation(toolName: string, args: any): Promise<boolean> {
    this.isAwaitingConfirmation = true;
    let preview = args.path || args.command || args.url || args.query || "";
    this.confirmationPrompt = `Allow ${toolName} (${preview.substring(0, 35)}...)? [y/N]`;
    this.emit("update");
    return new Promise((resolve) => {
      this.confirmResolve = resolve;
    });
  }

  submitConfirmation(allow: boolean) {
    this.isAwaitingConfirmation = false;
    this.emit("update");
    if (this.confirmResolve) {
      this.confirmResolve(allow);
      this.confirmResolve = null;
    }
  }

  complete(stats?: SessionStats) {
    if (stats) this.messages.push({ role: "stats", stats });
    this.emit("update");
  }

  error(content: string) {
    this.messages.push({ role: "error", content });
    this.emit("update");
  }

  info(content: string) {
    this.messages.push({ role: "info", content });
    this.emit("update");
  }

  clear() {
    this.messages = [];
    this.currentStream = "";
    this.currentReasoning = "";
    this.emit("update");
  }
}

export const UI = new UIStateManager();
