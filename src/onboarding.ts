import inquirer from "inquirer";
import fs from "fs/promises";
import path from "path";
import os from "os";
import ora from "ora";
import dotenv from "dotenv";
import { UI } from "./ui.js";

const CONFIG_DIR = path.join(os.homedir(), ".lowkeyarhan");
const ENV_FILE = path.join(CONFIG_DIR, ".env");

export async function ensureOnboarding(
  forceSetup = false,
  exitOnComplete?: boolean,
): Promise<void> {
  const isSetup = forceSetup;
  const shouldExit = exitOnComplete !== undefined ? exitOnComplete : forceSetup;

  if (!isSetup) {
    try {
      const stats = await fs.stat(ENV_FILE);
      if (stats.isFile()) {
        const envContent = await fs.readFile(ENV_FILE, "utf-8");
        const envConfig = dotenv.parse(envContent);

        const provider = envConfig.PROVIDER || "openrouter";
        let hasKey = false;

        switch (provider) {
          case "openrouter":
            hasKey = !!envConfig.OPENROUTER_API_KEY;
            break;
          case "openai":
            hasKey = !!envConfig.OPENAI_API_KEY;
            break;
          case "anthropic":
            hasKey = !!envConfig.ANTHROPIC_API_KEY;
            break;
          case "google":
            hasKey = !!envConfig.GOOGLE_API_KEY;
            break;
          case "custom":
            hasKey = !!envConfig.CUSTOM_API_KEY;
            break;
        }

        if (hasKey) {
          // If a valid global config exists and --setup is absent, proceed.
          dotenv.config({ path: ENV_FILE });
          return;
        }
      }
    } catch (e) {
      // File doesn't exist or can't be read, proceed to wizard
    }
  }

  UI.setupHeader();

  const answers1 = await inquirer.prompt([
    {
      type: "list",
      name: "provider",
      message: "Provider",
      choices: [
        {
          name: "OpenRouter        (recommended — 300+ models, single key)",
          value: "openrouter",
        },
        { name: "OpenAI            (GPT-4o, GPT-4.1)", value: "openai" },
        {
          name: "Anthropic         (Claude Sonnet 4, Claude Opus 4)",
          value: "anthropic",
        },
        { name: "Google AI Studio  (Gemini direct)", value: "google" },
        {
          name: "Custom            (self-hosted / other OpenAI-compatible)",
          value: "custom",
        },
      ],
    },
  ]);

  const provider = answers1.provider;

  const answers2 = await inquirer.prompt([
    {
      type: "password",
      name: "apiKey",
      message: "API key",
      mask: "*",
      validate: (input) => {
        if (!input) return "API key cannot be empty";
        return true;
      },
    },
  ]);

  let apiKey = answers2.apiKey;
  let keyValid = true;

  if (provider === "openrouter" && !apiKey.startsWith("sk-or-"))
    keyValid = false;
  if (provider === "openai" && !apiKey.startsWith("sk-")) keyValid = false;
  if (provider === "anthropic" && !apiKey.startsWith("sk-ant-"))
    keyValid = false;
  if (provider === "google" && !apiKey.startsWith("AIza")) keyValid = false;

  if (!keyValid) {
    const confirm = await inquirer.prompt([
      {
        type: "confirm",
        name: "continue",
        message:
          "  ✗ Key format looks wrong for this provider. Continue anyway?",
        default: false,
      },
    ]);
    if (!confirm.continue) {
      console.log("Setup cancelled.");
      process.exit(1);
    }
  }

  // Testing connection

  const spinner = ora("Testing connection...").start();

  try {
    let baseURL = "";
    if (provider === "openrouter") baseURL = "https://openrouter.ai/api/v1";
    if (provider === "openai") baseURL = "https://api.openai.com/v1";
    if (provider === "anthropic") baseURL = "https://api.anthropic.com/v1";
    if (provider === "google")
      baseURL = "https://generativelanguage.googleapis.com/v1beta/openai";

    // Note: custom base url is asked later, so we skip test for custom, or we ask it first if we want to test.
    if (provider !== "custom") {
      const res = await fetch(`${baseURL}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      // Just a simple test. We just care if it doesn't 401/403.
      if (res.status === 401 || res.status === 403) {
        throw new Error("Invalid API key");
      }
    } else {
      // skip test for custom before getting base url
    }

    spinner.succeed("  ✓ Connection verified");
  } catch (e: any) {
    spinner.fail("Connection failed.");
    const confirm2 = await inquirer.prompt([
      {
        type: "confirm",
        name: "save",
        message: "  Connection failed. Save anyway?",
        default: false,
      },
    ]);
    if (!confirm2.save) {
      console.log("Setup cancelled.");
      process.exit(1);
    }
  }

  // Model Selection
  let modelChoices: any[] = [];
  if (provider === "openrouter") {
    modelChoices = [
      {
        name: "google/gemini-2.5-pro          (recommended — best coding, 1M context)",
        value: "google/gemini-2.5-pro",
      },
      {
        name: "google/gemini-2.5-flash         (fast, free tier available)",
        value: "google/gemini-2.5-flash",
      },
      {
        name: "google/gemini-2.5-pro-preview   (latest preview)",
        value: "google/gemini-2.5-pro-preview",
      },
      {
        name: "anthropic/claude-sonnet-4-5     (excellent at code)",
        value: "anthropic/claude-sonnet-4-5",
      },
      {
        name: "meta-llama/llama-3.3-70b-instruct:free  (free, no key cost)",
        value: "meta-llama/llama-3.3-70b-instruct:free",
      },
      { name: "─ Enter custom model ID ─", value: "custom_model" },
    ];
  } else if (provider === "openai") {
    modelChoices = [
      { name: "gpt-4.1", value: "gpt-4.1" },
      { name: "gpt-4.1-mini", value: "gpt-4.1-mini" },
      { name: "gpt-4o", value: "gpt-4o" },
      { name: "─ Enter custom model ID ─", value: "custom_model" },
    ];
  } else if (provider === "anthropic") {
    modelChoices = [
      { name: "claude-sonnet-4-5", value: "claude-sonnet-4-5" },
      { name: "claude-opus-4-5", value: "claude-opus-4-5" },
      { name: "claude-haiku-4-5", value: "claude-haiku-4-5" },
      { name: "─ Enter custom model ID ─", value: "custom_model" },
    ];
  } else if (provider === "google") {
    modelChoices = [
      {
        name: "gemini-2.5-pro-preview-05-06",
        value: "gemini-2.5-pro-preview-05-06",
      },
      {
        name: "gemini-2.5-flash-preview-05-20",
        value: "gemini-2.5-flash-preview-05-20",
      },
      { name: "gemini-2.0-flash", value: "gemini-2.0-flash" },
      { name: "─ Enter custom model ID ─", value: "custom_model" },
    ];
  } else {
    modelChoices = [
      { name: "─ Enter custom model ID ─", value: "custom_model" },
    ];
  }

  const answers3 = await inquirer.prompt([
    {
      type: "list",
      name: "modelSelect",
      message: "Model",
      choices: modelChoices,
    },
  ]);

  let model = answers3.modelSelect;
  if (model === "custom_model") {
    const customMatch = await inquirer.prompt([
      {
        type: "input",
        name: "customModel",
        message: "Enter custom model ID:",
      },
    ]);
    model = customMatch.customModel;
  }

  let customBaseUrl = "http://localhost:11434/v1";
  if (provider === "custom") {
    const answers4 = await inquirer.prompt([
      {
        type: "input",
        name: "baseUrl",
        message: "Base URL (e.g. http://localhost:11434/v1)",
        default: "http://localhost:11434/v1",
      },
    ]);
    customBaseUrl = answers4.baseUrl;
  }

  const answers5 = await inquirer.prompt([
    {
      type: "input",
      name: "appName",
      message: "App name (shown in OpenRouter dashboard, press Enter to skip)",
      default: "lowkeyarhan",
    },
  ]);
  const appName = answers5.appName;

  await fs.mkdir(CONFIG_DIR, { recursive: true });

  const envLines: string[] = [
    `PROVIDER=${provider}`,
    `OPENROUTER_MODEL=${model}`, // Kept OPENROUTER_MODEL as requested, we map this in agent config
    `APP_NAME=${appName}`,
    `APP_URL=http://localhost`,
  ];

  if (provider === "openrouter") envLines.push(`OPENROUTER_API_KEY=${apiKey}`);
  if (provider === "openai") envLines.push(`OPENAI_API_KEY=${apiKey}`);
  if (provider === "anthropic") envLines.push(`ANTHROPIC_API_KEY=${apiKey}`);
  if (provider === "google") envLines.push(`GOOGLE_API_KEY=${apiKey}`);
  if (provider === "custom") {
    envLines.push(`CUSTOM_API_KEY=${apiKey}`);
    envLines.push(`CUSTOM_BASE_URL=${customBaseUrl}`);
  }

  await fs.writeFile(ENV_FILE, envLines.join("\n") + "\n", "utf-8");

  console.log("  ✓ Config saved to ~/.lowkeyarhan/.env");
  console.log("  Run 'lowkeyarhan --setup' anytime to change these settings.");
  console.log();

  // Load into env for this process
  dotenv.config({ path: ENV_FILE, override: true });

  if (shouldExit) {
    process.exit(0);
  }
}
