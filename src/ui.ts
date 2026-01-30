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
    console.log(
      colors.accent("* ") + colors.keyword("Thinking") + colors.textDim("..."),
    );
    console.log();
  }

  static streamContent(content: string) {
    // Stream content directly - write as-is to preserve natural flow
    process.stdout.write(colors.text(content));
  }

  static toolCallStart(toolName: string, args: Record<string, any>) {
    console.log();
    console.log(
      colors.accent("* ") + colors.keyword(this.formatToolName(toolName)),
    );

    // Format arguments with indentation
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === "string" && value.length > 100) {
        console.log(
          colors.textDim(`    ${key}: `) +
            colors.comment(`<${value.length} chars>`),
        );
      } else if (typeof value === "string" && value.includes("\n")) {
        console.log(colors.textDim(`    ${key}:`));
        const lines = value.split("\n").slice(0, 5);
        lines.forEach((line) => console.log(colors.comment(`      ${line}`)));
        if (value.split("\n").length > 5) {
          console.log(
            colors.comment(
              `      ... (${value.split("\n").length - 5} more lines)`,
            ),
          );
        }
      } else {
        console.log(
          colors.textDim(`    ${key}: `) +
            colors.comment(JSON.stringify(value)),
        );
      }
    }
    console.log();
  }

  static toolCallResult(success: boolean, output?: string, error?: string) {
    if (success) {
      console.log(colors.success("  ✓ ") + colors.text("Success"));
      if (output && output.length > 0) {
        this.displayOutput(output);
      }
    } else {
      console.log(colors.error("  ✗ ") + colors.text("Failed"));
      if (error) {
        console.log(colors.error(`    ${error}`));
      }
    }
    console.log();
  }

  private static displayOutput(output: string) {
    const maxLines = 20;
    const maxChars = 1000;

    if (output.length > maxChars) {
      const truncated = output.substring(0, maxChars);
      const lines = truncated.split("\n");
      lines.forEach((line) => console.log(colors.textDim(`    ${line}`)));
      console.log(
        colors.comment(`    ... (${output.length - maxChars} more characters)`),
      );
    } else {
      const lines = output.split("\n");
      if (lines.length > maxLines) {
        lines
          .slice(0, maxLines)
          .forEach((line) => console.log(colors.textDim(`    ${line}`)));
        console.log(
          colors.comment(`    ... (${lines.length - maxLines} more lines)`),
        );
      } else {
        lines.forEach((line) => console.log(colors.textDim(`    ${line}`)));
      }
    }
  }

  static confirmation(toolName: string, args: Record<string, any>): string {
    const formattedTool = this.formatToolName(toolName);
    const preview = this.getConfirmationPreview(toolName, args);
    return (
      "\n" +
      colors.warning("  ▸ ") +
      colors.keyword(formattedTool) +
      (preview ? colors.textDim(` - ${preview}`) : "") +
      colors.warning("\n    Proceed?")
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
        return `${args.command}`;
      case "read_file":
        return `${args.path}`;
      case "list_files":
        return `${args.path}`;
      default:
        return "";
    }
  }

  static cancelled() {
    console.log(colors.warning("  ✗ ") + colors.text("Cancelled by user"));
    console.log();
  }

  static complete() {
    console.log();
    console.log(colors.accent("* ") + colors.keyword("Complete"));
    console.log(
      colors.success("  ✓ ") + colors.text("Task completed successfully"),
    );
    console.log();
  }

  static error(message: string) {
    console.log();
    console.log(colors.error("  ✗ Error: ") + colors.text(message));
    console.log();
  }

  static warning(message: string) {
    console.log(colors.warning("  ⚠ ") + colors.text(message));
  }

  static info(message: string) {
    console.log(colors.textDim(`  ${message}`));
  }

  static maxIterations() {
    console.log();
    console.log(
      colors.warning("  ⚠ ") + colors.text("Maximum iterations reached"),
    );
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
