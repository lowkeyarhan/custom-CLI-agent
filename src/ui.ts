import chalk from "chalk";

// Claude Code inspired color scheme - Coral & Blue
const colors = {
  // Primary accent - coral/orange
  accent: chalk.hex("#FF6B4A"),
  // Secondary - blue/cyan
  blue: chalk.hex("#4A90E2"),
  // Text colors
  text: chalk.hex("#E8E8E8"),
  textDim: chalk.hex("#808080"),
  textVeryDim: chalk.hex("#505050"),
  // Status colors
  success: chalk.hex("#5ECC8A"),
  error: chalk.hex("#FF5555"),
  warning: chalk.hex("#FFB84A"),
  // Special
  keyword: chalk.hex("#FF8C66"),
  comment: chalk.hex("#6B7280"),
};

export class UI {
  static welcome() {
    console.log();
    console.log(colors.accent("* ") + colors.text("Welcome to lowkeyarhan!"));
    console.log();
  }

  static header(title: string, subtitle?: string) {
    console.log();
    console.log(colors.accent("* ") + colors.text(title));
    if (subtitle) {
      console.log(colors.textDim(`  ${subtitle}`));
    }
    console.log();
  }

  static taskStart(task: string) {
    console.log(colors.accent("* ") + colors.keyword("Task"));
    console.log(colors.textVeryDim("  " + "─".repeat(60)));
    console.log(colors.text("  " + task));
    console.log(colors.textVeryDim("  " + "─".repeat(60)));
    console.log();
  }

  static thinking() {
    // This is now handled by ora spinner in agent.ts
    // Kept for backwards compatibility but not used
  }

  static streamContent(content: string) {
    // Stream content directly - write as-is to preserve natural flow
    process.stdout.write(colors.text(content));
  }

  static streamComplete() {
    // Add newline when streaming completes
    console.log();
  }

  static toolCallStart(toolName: string, args: Record<string, any>) {
    // Minimal tool call display - just tool name and key info
    const formattedTool = this.formatToolName(toolName);
    let preview = "";

    switch (toolName) {
      case "read_file":
        preview = args.path;
        break;
      case "write_file":
        preview = args.path;
        break;
      case "list_files":
        preview = args.path + (args.recursive === "true" ? " (recursive)" : "");
        break;
      case "run_command":
        preview =
          args.command.length > 50
            ? args.command.substring(0, 47) + "..."
            : args.command;
        break;
    }

    console.log(
      colors.accent("* ") +
        colors.keyword(formattedTool) +
        (preview ? colors.textDim(` → ${preview}`) : ""),
    );
  }

  static toolCallResult(success: boolean, output?: string, error?: string) {
    if (success) {
      // Minimal success indicator
      const summary = this.summarizeOutput(output);
      if (summary) {
        console.log(colors.success("  ✓ ") + colors.textDim(summary));
      } else {
        console.log(colors.success("  ✓"));
      }
    } else {
      console.log(colors.error("  ✗ ") + colors.text(error || "Failed"));
    }
  }

  private static summarizeOutput(output?: string): string {
    if (!output || output.length === 0) return "";

    // For file listings, show just count
    if (output.includes("📁") || output.includes("📄")) {
      const lines = output.split("\n").filter((l) => l.trim());
      const fileCount = lines.filter((l) => l.includes("📄")).length;
      const dirCount = lines.filter((l) => l.includes("📁")).length;
      if (fileCount > 0 || dirCount > 0) {
        const parts = [];
        if (fileCount > 0)
          parts.push(`${fileCount} file${fileCount !== 1 ? "s" : ""}`);
        if (dirCount > 0)
          parts.push(`${dirCount} dir${dirCount !== 1 ? "s" : ""}`);
        return parts.join(", ");
      }
    }

    // For file content, show line count
    if (output.includes("\n")) {
      const lines = output.split("\n").length;
      if (lines > 1) {
        return `${lines} lines`;
      }
    }

    // For short content, show character count
    if (output.length < 200) {
      return `${output.length} chars`;
    }

    // For long content, just show it's there
    return "Content retrieved";
  }

  static confirmation(toolName: string, args: Record<string, any>): string {
    const formattedTool = this.formatToolName(toolName);
    const preview = this.getConfirmationPreview(toolName, args);
    return (
      colors.warning("  ▸ ") +
      colors.keyword(formattedTool) +
      (preview ? colors.textDim(` - ${preview}`) : "") +
      colors.warning(" → Proceed?")
    );
  }

  private static getConfirmationPreview(
    toolName: string,
    args: Record<string, any>,
  ): string {
    switch (toolName) {
      case "write_file":
        return `${args.path}`;
      case "run_command":
        return args.command.length > 40
          ? args.command.substring(0, 37) + "..."
          : args.command;
      case "read_file":
        return `${args.path}`;
      case "list_files":
        return `${args.path}`;
      default:
        return "";
    }
  }

  static cancelled() {
    console.log(colors.textDim("  ✗ Cancelled"));
  }

  static complete() {
    console.log();
    console.log(colors.accent("* ") + colors.keyword("Complete"));
    console.log(colors.success("  ✓ Task completed"));
    console.log();
  }

  static error(message: string) {
    console.log();
    // Handle multi-line error messages
    const lines = message.split("\n");
    console.log(colors.error("  ✗ Error: ") + colors.text(lines[0]));
    if (lines.length > 1) {
      lines.slice(1).forEach((line) => {
        console.log(colors.text(`    ${line}`));
      });
    }
    console.log();
  }

  static warning(message: string) {
    // Suppress verbose warnings - only show critical ones
    // This prevents clutter from "Agent mentioned using tools" messages
    if (!message.includes("mentioned using tools")) {
      console.log(colors.textDim(`  ${message}`));
    }
  }

  static info(message: string) {
    console.log(colors.textDim(`  ${message}`));
  }

  static maxIterations() {
    console.log();
    console.log(colors.warning("  ⚠ Maximum iterations reached"));
    console.log();
  }

  private static formatToolName(name: string): string {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  static separator() {
    console.log(colors.textVeryDim("  " + "─".repeat(60)));
  }

  static processing(message: string) {
    console.log(
      colors.accent("* ") + colors.keyword(message) + colors.textDim("..."),
    );
  }

  static prompt(): string {
    // Return the prompt string for readline (Claude Code style)
    return colors.accent("> ") + colors.text("");
  }
}
