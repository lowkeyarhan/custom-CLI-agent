import inquirer from "inquirer";
import fs from "fs/promises";
import path from "path";
import os from "os";
import dotenv from "dotenv";
import chalk from "chalk";

const CONFIG_DIR = path.join(os.homedir(), ".lowkeyarhan");
const ENV_FILE = path.join(CONFIG_DIR, ".env");

export async function ensureOnboarding(
  forceSetup = false,
  exitOnComplete?: boolean,
): Promise<void> {
  const shouldExit = exitOnComplete !== undefined ? exitOnComplete : forceSetup;

  if (!forceSetup) {
    try {
      const stats = await fs.stat(ENV_FILE);
      if (stats.isFile()) {
        const envContent = await fs.readFile(ENV_FILE, "utf-8");
        const envConfig = dotenv.parse(envContent);

        if (envConfig.BASE_URL && envConfig.API_KEY && envConfig.MODEL_ID) {
          dotenv.config({ path: ENV_FILE });
          return;
        }
      }
    } catch (e) {
      // Configuration file not found or invalid, proceed to onboarding
    }
  }

  console.log();
  console.log(chalk.white.bold("  Setup"));
  console.log(
    chalk.hex("#888888")("  Configure your AI connectivity parameters.\n"),
  );

  // Using a gray '❯' instead of the default green '?'
  const customPrefix = chalk.hex("#888888")("❯");

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "baseUrl",
      message: "Provider URL:",
      prefix: customPrefix,
      validate: (input) => (input ? true : "Provider URL cannot be empty"),
    },
    {
      type: "password",
      name: "apiKey",
      message: "API Key:",
      mask: "*",
      prefix: customPrefix,
      validate: (input) => (input ? true : "API Key cannot be empty"),
    },
    {
      type: "input",
      name: "modelId",
      message: "LLM Model ID:",
      prefix: customPrefix,
      validate: (input) => (input ? true : "Model ID cannot be empty"),
    },
  ]);

  await fs.mkdir(CONFIG_DIR, { recursive: true });

  const envLines: string[] = [
    `BASE_URL=${answers.baseUrl}`,
    `API_KEY=${answers.apiKey}`,
    `MODEL_ID=${answers.modelId}`,
  ];

  await fs.writeFile(ENV_FILE, envLines.join("\n") + "\n", "utf-8");

  console.log();
  console.log(chalk.hex("#888888")("  Config saved to ~/.lowkeyarhan/.env"));
  console.log(
    chalk.hex("#444444")(
      "  Run 'lowkeyarhan --setup' anytime to change these settings.\n",
    ),
  );

  dotenv.config({ path: ENV_FILE, override: true });

  if (shouldExit) {
    process.exit(0);
  }
}
