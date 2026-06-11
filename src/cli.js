import fs from "node:fs";
import path from "node:path";
import { parseArgs, usage } from "./args.js";
import { installAtomicTooling } from "./installer.js";

const assertProjectRoot = (cwd) => {
  if (!fs.existsSync(path.join(cwd, "package.json"))) {
    throw new Error(
      "No package.json found. Run create-atomic-install from the application root.",
    );
  }
};

export const runCli = async ({
  args = process.argv.slice(2),
  cwd = process.cwd(),
} = {}) => {
  try {
    const options = parseArgs(args);

    if (options.help) {
      console.log(usage);
      return;
    }

    assertProjectRoot(cwd);
    await installAtomicTooling({ cwd, ...options });
    console.log("\nAtomic tooling installation complete.");
  } catch (error) {
    console.error(`\nAtomic tooling installation failed: ${error.message}`);
    process.exitCode = 1;
  }
};
