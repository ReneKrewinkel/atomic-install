import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { parseArgs, usage } from "./args.js";
import { installAtomicTooling } from "./installer.js";

const assertProjectRoot = (cwd) => {
  if (!fs.existsSync(path.join(cwd, "package.json"))) {
    throw new Error(
      "No package.json found. Run create-atomic-install from the application root.",
    );
  }
};

export const shouldInstallStorybook = async ({
  question,
  skipStorybook = false,
  storybook = false,
} = {}) => {
  if (storybook) return true;
  if (skipStorybook || !question) return false;

  const answer = await question("Install Storybook as well? [y/N]: ");
  return ["y", "yes"].includes(answer.trim().toLowerCase());
};

export const runCli = async ({
  args = process.argv.slice(2),
  cwd = process.cwd(),
  input = process.stdin,
  output = process.stdout,
  question,
  isInteractive = Boolean(input.isTTY && output.isTTY),
} = {}) => {
  let rl;
  try {
    const options = parseArgs(args);

    if (options.help) {
      console.log(usage);
      return;
    }

    assertProjectRoot(cwd);
    if (!question && isInteractive) {
      rl = question ? undefined : readline.createInterface({ input, output });
    }
    const installStorybook = await shouldInstallStorybook({
      question: question || (rl ? (message) => rl.question(message) : undefined),
      skipStorybook: options.skipStorybook,
      storybook: options.storybook,
    });

    await installAtomicTooling({ cwd, installStorybook, ...options });
    console.log("\nAtomic tooling installation complete.");
  } catch (error) {
    console.error(`\nAtomic tooling installation failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    rl?.close();
  }
};
