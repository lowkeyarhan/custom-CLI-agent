import chalk from "chalk";
import { UsageStats, SessionStats } from "./types.js";

// Exact Claude Code Color Palette
const colors = {
  accent: chalk.hex("#A8CC8C"), // muted green (> prompt and ✓ checkmarks)
  toolName: chalk.hex("#E8B86D"), // warm amber (tool names, "Done", "Task")
  dimText: chalk.hex("#666666"), // medium gray (stats, secondary info)
  veryDimText: chalk.hex("#444444"), // dark gray (separators, very minor info)
  white: chalk.hex("#EEEEEE"), // near-white (primary content, task text)
  errorRed: chalk.hex("#CC8888"), // muted red (errors)
  warningAmb: chalk.hex("#E8B86D"), // same as toolName for warnings
  success: chalk.hex("#A8CC8C"), // same as accent
  keyword: chalk.hex("#E8B86D"), // same as toolName
};

export class UI {
  private static _pendingToolLine = false;

  private static ensureNewline() {
    if (this._pendingToolLine) {
      process.stdout.write("\n");
      this._pendingToolLine = false;
    }
  }

  static welcome() {
    this.ensureNewline();
    console.log();
    console.log(colors.accent("> ") + colors.white("lowkeyarhan"));
    console.log();
  }

  static info(message: string) {
    this.ensureNewline();
    console.log(colors.dimText("  " + message));
  }

  static taskStart(task: string) {
    this.ensureNewline();
    console.log();
    console.log(colors.accent("> ") + colors.toolName("Task"));
    console.log(colors.white("  " + task));
    console.log();
  }

  static prompt(): string {
    this.ensureNewline();
    return colors.accent("> ");
  }

  static streamContent(content: string) {
    this.ensureNewline();
    process.stdout.write(colors.white(content));
  }

  static streamComplete() {
    // We do not set pending to false here because streamContent already handles newline naturally,
    // but we do print a newline to end the stream cleanly.
    console.log();
  }

  static usageStats(stats: UsageStats): void {
    this.ensureNewline();
    const parts: string[] = [];

    if (stats.inputTokens !== null) {
      parts.push(`↑ ${stats.inputTokens.toLocaleString()} in`);
    }
    if (stats.outputTokens !== null) {
      parts.push(`↓ ${stats.outputTokens.toLocaleString()} out`);
    }
    if (stats.reasoningTokens) {
      parts.push(`⟳ ${stats.reasoningTokens.toLocaleString()} thinking`);
    }
    if (stats.ttftMs !== null) {
      parts.push(`TTFT ${stats.ttftMs}ms`);
    }
    parts.push(`${(stats.totalMs / 1000).toFixed(1)}s`);

    console.log(colors.dimText("  " + parts.join("  ·  ")));
  }

  static toolCallStart(toolName: string, args: Record<string, any>) {
    this.ensureNewline();

    const claudeName = this.formatToolName(toolName);
    let preview = "";

    switch (toolName) {
      case "read_file":
      case "write_file":
        preview = args.path
          ? args.path.length > 50
            ? args.path.substring(0, 47) + "..."
            : args.path
          : "";
        break;
      case "list_files":
        preview = args.path + (args.recursive === "true" ? " (recursive)" : "");
        break;
      case "run_command":
        preview = args.command
          ? args.command.length > 60
            ? args.command.substring(0, 57) + "..."
            : args.command
          : "";
        break;
      case "fetch_url":
        const urlObj = args.url
          ? args.url.length > 60
            ? args.url.substring(0, 57) + "..."
            : args.url
          : "";
        const cssStr = args.extract_css ? ", extract_css=true" : "";
        preview = urlObj + cssStr;
        if (preview.length > 60) preview = preview.substring(0, 57) + "...";
        break;
      case "search_web":
        preview = args.query ? '"' + args.query + '"' : "";
        if (preview.length > 50) preview = preview.substring(0, 47) + "...";
        break;
    }

    process.stdout.write(
      colors.veryDimText("⎿ ") +
        colors.toolName(claudeName) +
        colors.dimText("(" + preview + ")"),
    );
    this._pendingToolLine = true;
  }

  static toolCallResult(
    success: boolean,
    output: string,
    error?: string,
    toolName?: string,
    args?: Record<string, any>,
  ) {
    if (!this._pendingToolLine) {
      // If something else printed, append the tool name again or just print
      process.stdout.write(
        colors.veryDimText("⎿ ") + colors.dimText("result "),
      );
    }

    if (success) {
      const summary = this.summarizeOutput(output, toolName, args);
      process.stdout.write(colors.dimText(" · " + summary + "\n"));
    } else {
      let errStr = error || "Failed";
      const firstLine = errStr.split("\n")[0];
      process.stdout.write(
        colors.dimText(" · ") + colors.errorRed("✗ " + firstLine) + "\n",
      );
    }

    this._pendingToolLine = false;
  }

  private static summarizeOutput(
    output: string,
    toolName?: string,
    args?: Record<string, any>,
  ): string {
    if (!output || output.length === 0) return "Success";

    switch (toolName) {
      case "read_file":
        const lines = output.split("\n").length;
        return `${lines} lines`;
      case "write_file":
        const bytes =
          args && args.content ? Buffer.byteLength(args.content, "utf8") : 0;
        return `${bytes.toLocaleString()} bytes written`;
      case "list_files":
        const linesList = output.split("\n").filter((l) => l.trim());
        const fileCount = linesList.filter((l) => l.includes("📄")).length;
        const dirCount = linesList.filter((l) => l.includes("📁")).length;
        return `${fileCount} files, ${dirCount} dirs`;
      case "run_command":
        return "✓ exit 0";
      case "fetch_url":
        const match = output.match(/Returned: (\d+) chars \| Format: ([a-z]+)/);
        if (match) {
          return `${match[1]} chars (${match[2]})`;
        }
        return `${output.length} chars`;
      case "search_web":
        const resCount = (output.match(/^\d+\./gm) || []).length;
        if (resCount > 0) return `${resCount} results`;
        return output.length < 50 ? output : "Search completed";
    }

    return "Success";
  }

  static confirmation(toolName: string, args: Record<string, any>): string {
    this.ensureNewline();
    console.log();
    const claudeName = this.formatToolName(toolName);
    let preview = "";

    switch (toolName) {
      case "read_file":
      case "write_file":
      case "list_files":
        preview = args.path || "";
        break;
      case "run_command":
        preview = args.command
          ? args.command.length > 40
            ? args.command.substring(0, 37) + "..."
            : args.command
          : "";
        break;
      case "fetch_url":
        preview = args.url || "";
        break;
      case "search_web":
        preview = args.query ? '"' + args.query + '"' : "";
        break;
    }

    return (
      colors.dimText("  Allow ") +
      colors.toolName(claudeName) +
      colors.dimText("(" + preview + ")?")
    );
  }

  static cancelled() {
    this.ensureNewline();
    console.log(colors.dimText("  Cancelled"));
  }

  static complete(session?: SessionStats) {
    this.ensureNewline();
    console.log();
    console.log(colors.accent("> ") + colors.keyword("Done"));
    console.log(colors.success("  ✓ ") + colors.dimText("Task completed"));

    if (session && session.totalInputTokens > 0) {
      const totalTokens = session.totalInputTokens + session.totalOutputTokens;
      console.log(
        colors.dimText(
          `  Session: ${session.iterations} steps · ` +
            `${session.totalInputTokens.toLocaleString()} in · ` +
            `${session.totalOutputTokens.toLocaleString()} out · ` +
            `${totalTokens.toLocaleString()} total · ` +
            `${(session.totalMs / 1000).toFixed(1)}s`,
        ),
      );
    }
    console.log();
  }

  static error(message: string) {
    this.ensureNewline();
    console.log();
    console.log(colors.accent("> ") + colors.errorRed("Error"));
    const lines = message.split("\n");
    for (const line of lines) {
      console.log(colors.dimText("  " + line));
    }
    console.log();
  }

  static warning(message: string) {
    this.ensureNewline();
    console.log(colors.dimText("  " + message));
  }

  static maxIterations() {
    this.ensureNewline();
    console.log();
    console.log(
      colors.warningAmb("  ⚠ ") + colors.dimText("Max iterations reached"),
    );
    console.log();
  }

  static setupHeader() {
    this.ensureNewline();
    console.log();
    console.log(colors.accent("> ") + colors.white("lowkeyarhan setup"));
    console.log(colors.dimText("  Configure your AI provider and model."));
    console.log();
  }

  private static formatToolName(name: string): string {
    switch (name) {
      case "read_file":
        return "Read";
      case "write_file":
        return "Write";
      case "list_files":
        return "List";
      case "run_command":
        return "Bash";
      case "fetch_url":
        return "Fetch";
      case "search_web":
        return "Search";
      default:
        return name
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
    }
  }
}
