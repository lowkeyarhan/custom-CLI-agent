import inquirer from "inquirer";
import fs from "fs/promises";
import path from "path";
import os from "os";
import dotenv from "dotenv";
import chalk from "chalk";

const ENV_FILE = path.join(os.homedir(), ".lowkeyarhan", ".env");

export async function ensureOnboarding(force = false) {
  if (!force) {
    try {
      await fs.stat(ENV_FILE);
      dotenv.config({ path: ENV_FILE });
      if (process.env.BASE_URL && process.env.API_KEY && process.env.MODEL_ID)
        return;
    } catch {}
  }

  console.log(chalk.bold.white("\n  lowkeyarhan setup\n"));
  const prompt = (msg: string) => chalk.hex("#888888")("❯ ") + msg;

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "baseUrl",
      message: prompt("Provider URL:"),
      validate: (i) => !!i,
    },
    {
      type: "password",
      name: "apiKey",
      message: prompt("API Key:"),
      mask: "*",
      validate: (i) => !!i,
    },
    {
      type: "input",
      name: "modelId",
      message: prompt("LLM Model ID:"),
      validate: (i) => !!i,
    },
  ]);

  await fs.mkdir(path.dirname(ENV_FILE), { recursive: true });
  await fs.writeFile(
    ENV_FILE,
    `BASE_URL=${answers.baseUrl}\nAPI_KEY=${answers.apiKey}\nMODEL_ID=${answers.modelId}\n`,
  );
  dotenv.config({ path: ENV_FILE, override: true });
}
