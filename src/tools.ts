import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import type { Tool, ToolResult } from "./types.js";

const execAsync = promisify(exec);

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export const tools: Tool[] = [
  {
    name: "read_file",
    description:
      "Read the contents of a file. Warns if file is larger than 1MB.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "The path to the file to read" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description:
      "Create or overwrite a file with the given content. Creates directories if needed.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "The path to the file to write" },
        content: { type: "string", description: "The content to write" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_files",
    description: "List files and directories in a given path.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "The directory path to list" },
        recursive: {
          type: "string",
          description: "Whether to list recursively",
          enum: ["true", "false"],
        },
        depth: {
          type: "string",
          description: "Maximum depth for recursive listing",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "run_command",
    description: "Execute a shell command.",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The shell command to execute",
        },
        cwd: { type: "string", description: "Working directory (optional)" },
      },
      required: ["command"],
    },
  },
  {
    name: "fetch_url",
    description:
      "Fetches the content of any URL and returns it as text or HTML. Use this whenever the user provides a URL or asks to clone/replicate a website. Reads the full page structure including CSS classes, layout patterns, and content sections.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Full URL including https://" },
        format: {
          type: "string",
          description:
            '"html" = Return raw HTML. Best for cloning — preserves class names, structure, and layout information. Truncated to 80,000 chars. "text" = Strip all tags, return readable text content only. Max 20,000 chars. "markdown" = Convert structure to markdown. Max 20,000 chars.',
          enum: ["text", "html", "markdown"],
        },
        extract_css: {
          type: "boolean",
          description:
            "If true, also extract all <style> tag contents and inline styles found in the page. Useful for understanding the visual design to replicate.",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "search_web",
    description:
      "Search the web using DuckDuckGo. Returns URLs and snippets. Use to find reference URLs, documentation, examples, or current information. Combine with fetch_url to visit promising results.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
        max_results: {
          type: "number",
          description: "Number of results (max 10, default 5)",
        },
      },
      required: ["query"],
    },
  },
];

export async function readFile(filePath: string): Promise<ToolResult> {
  try {
    const stats = await fs.stat(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      return {
        success: false,
        output: "",
        error: `Warning: File size is ${(stats.size / 1024 / 1024).toFixed(2)}MB, which exceeds 1MB. Consider reading a smaller file.`,
      };
    }
    const content = await fs.readFile(filePath, "utf-8");
    return { success: true, output: content };
  } catch (error) {
    return {
      success: false,
      output: "",
      error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function writeFile(
  filePath: string,
  content: string,
): Promise<ToolResult> {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
    return { success: true, output: `Successfully wrote to ${filePath}` };
  } catch (error) {
    return {
      success: false,
      output: "",
      error: `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function listFiles(
  dirPath: string,
  recursive: boolean = false,
  maxDepth: number = 2,
  currentDepth: number = 0,
): Promise<ToolResult> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let output = "";
    for (const entry of entries) {
      const indent = "  ".repeat(currentDepth);
      const prefix = entry.isDirectory() ? "📁" : "📄";
      output += `${indent}${prefix} ${entry.name}\n`;
      if (recursive && entry.isDirectory() && currentDepth < maxDepth) {
        const subPath = path.join(dirPath, entry.name);
        const subResult = await listFiles(
          subPath,
          true,
          maxDepth,
          currentDepth + 1,
        );
        if (subResult.success) {
          output += subResult.output;
        }
      }
    }
    return { success: true, output: output || "Empty directory" };
  } catch (error) {
    return {
      success: false,
      output: "",
      error: `Failed to list files: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function runCommand(
  command: string,
  cwd?: string,
): Promise<ToolResult> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd || process.cwd(),
      maxBuffer: 1024 * 1024 * 10,
    });
    return {
      success: true,
      output: stdout || stderr || "Command executed successfully (no output)",
    };
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout || "",
      error: error.stderr || error.message || "Command execution failed",
    };
  }
}

export async function fetchUrl(
  url: string,
  format: string = "html",
  extractCss: boolean = false,
): Promise<ToolResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
        "Cache-Control": "no-cache",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const finalUrl = response.url;
    const statusCode = response.status;

    if (statusCode >= 400) {
      if (statusCode === 403)
        return {
          success: false,
          output: "",
          error: `Access denied (403). Site may block bots. Try a different URL.`,
        };
      if (statusCode === 404)
        return {
          success: false,
          output: "",
          error: `Page not found (404): ${url}`,
        };
      return {
        success: false,
        output: "",
        error: `HTTP ${statusCode} error fetching ${url}`,
      };
    }

    let text = await response.text();
    const originalLength = text.length;
    let cssExtracted = "";

    if (format === "html") {
      if (extractCss) {
        const styleMatches = [
          ...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi),
        ];
        cssExtracted = styleMatches.map((m) => m[1]).join("\n\n");
      }
      text = text.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        "",
      );
      text = text.replace(
        /<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi,
        "",
      );
      text = text.replace(/\n{4,}/g, "\n\n\n");
      if (text.length > 80000)
        text = text.substring(0, 80000) + "\n[...truncated]";
      if (extractCss && cssExtracted) {
        text += "\n\n=== EXTRACTED CSS ===\n" + cssExtracted;
      }
    } else if (format === "text") {
      text = text.replace(
        /<(script|style|noscript|head)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi,
        "",
      );
      text = text.replace(/<(br|\/p|\/div|\/li|\/h[1-6])>/gi, "\n");
      text = text.replace(/(<([^>]+)>)/gi, "");
      text = text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&nbsp;/g, " ");
      text = text.replace(/[^\S\r\n]+/g, " ");
      text = text.replace(/\n\s*\n/g, "\n\n");
      text = text.trim();
      if (text.length > 20000)
        text = text.substring(0, 20000) + "\n[...truncated]";
    } else if (format === "markdown") {
      text = text.replace(
        /<h([1-6])[^>]*>(.*?)<\/h\1>/gi,
        (_, level, t) => `${"#".repeat(Number(level))} ${t}\n`,
      );
      text = text.replace(
        /<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi,
        "[$2]($1)",
      );
      text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
      text = text.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, "**$2**");
      text = text.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, "*$2*");
      text = text.replace(
        /<img[^>]+alt="([^"]*)"[^>]+src="([^"]+)"[^>]*>/gi,
        "![$1]($2)",
      );
      text = text.replace(/(<([^>]+)>)/gi, "");
      text = text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&nbsp;/g, " ");
      text = text.replace(/\n\s*\n/g, "\n\n");
      text = text.trim();
      if (text.length > 20000)
        text = text.substring(0, 20000) + "\n[...truncated]";
    }

    const processedLength = text.length;
    let output = `URL: ${finalUrl}\n`;
    output += `Status: ${statusCode} | Size: ${originalLength} chars | Returned: ${processedLength} chars | Format: ${format}\n`;
    output += "─".repeat(60) + "\n";
    output += text;

    return { success: true, output };
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === "AbortError")
      return {
        success: false,
        output: "",
        error: `Request timed out after 20s for ${url}`,
      };
    if (error instanceof TypeError)
      return { success: false, output: "", error: `Invalid URL: ${url}` };
    return {
      success: false,
      output: "",
      error: `HTTP error fetching ${url}: ${error.message}`,
    };
  }
}

export async function searchWeb(
  query: string,
  maxResults: number = 5,
): Promise<ToolResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const resultLimit = Math.min(10, Math.max(1, Number(maxResults) || 5));

  const cleanHtml = (value: string): string =>
    value
      .replace(/(<([^>]+)>)/gi, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const unwrapDuckDuckGoUrl = (url: string): string => {
    const normalized = url.replace(/&amp;/g, "&");
    try {
      const parsed = new URL(normalized, "https://lite.duckduckgo.com");
      const uddg = parsed.searchParams.get("uddg");
      return uddg || parsed.href;
    } catch {
      return normalized;
    }
  };

  try {
    const searchUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "identity",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.status >= 400) {
      return {
        success: false,
        output: "",
        error: `Search blocked (${response.status}). Try fetch_url with a specific URL instead.`,
      };
    }

    const html = await response.text();

    const linkMatches = [
      ...html.matchAll(
        /<a\b(?=[^>]*\bclass=["'][^"']*\bresult-link\b[^"']*["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>([\s\S]*?)<\/a>/gi,
      ),
    ];
    const snippetMatches = [
      ...html.matchAll(
        /<td\b(?=[^>]*\bclass=["'][^"']*\bresult-snippet\b[^"']*["'])[^>]*>([\s\S]*?)<\/td>/gi,
      ),
    ];

    const results: string[] = [];
    for (let i = 0; i < Math.min(resultLimit, linkMatches.length); i++) {
      const url = unwrapDuckDuckGoUrl(linkMatches[i][1]);
      const title = cleanHtml(linkMatches[i][2]);
      const snippet = snippetMatches[i] ? cleanHtml(snippetMatches[i][1]) : "";
      results.push(
        `${i + 1}. ${title}\n   ${url}${snippet ? `\n   ${snippet}` : ""}\n`,
      );
    }

    if (results.length > 0) {
      return { success: true, output: results.join("\n") };
    }

    const iaUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const iaRes = await fetch(iaUrl, { signal: AbortSignal.timeout(8000) });
    const iaData: any = await iaRes.json();

    if (iaData.AbstractText) {
      return {
        success: true,
        output: `1. ${iaData.Heading}\n   ${iaData.AbstractURL}\n   ${iaData.AbstractText}\n`,
      };
    }

    return {
      success: true,
      output: `No results found for: "${query}"\n\nTip: Use fetch_url with a direct URL instead, or try a more specific query.`,
    };
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      return {
        success: false,
        output: "",
        error: `Search timed out. Use fetch_url with a specific URL instead.`,
      };
    }
    return {
      success: false,
      output: "",
      error: `Search failed: ${error.message}. Use fetch_url with a specific URL instead.`,
    };
  }
}

export async function executeTool(
  name: string,
  args: Record<string, any>,
): Promise<ToolResult> {
  switch (name) {
    case "read_file":
      return readFile(args.path);
    case "write_file":
      return writeFile(args.path, args.content);
    case "list_files":
      return listFiles(
        args.path,
        args.recursive === "true",
        args.depth ? parseInt(args.depth, 10) : 2,
      );
    case "run_command":
      return runCommand(args.command, args.cwd);
    case "fetch_url":
      return fetchUrl(
        args.url,
        args.format || "html",
        args.extract_css || false,
      );
    case "search_web":
      return searchWeb(args.query, args.max_results || 5);
    default:
      return { success: false, output: "", error: `Unknown tool: ${name}` };
  }
}
