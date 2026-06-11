import fs from "node:fs";
import path from "node:path";
import {
  detectPackageManager,
  getDependencyInstallCommand,
} from "./package-manager.js";
import { runCommand } from "./runner.js";

const latestPackages = {
  atomicBomb: "atomic-bomb@latest",
  resources: "create-atomic-resources@latest",
};

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

export const createInstallPlan = ({
  cwd = process.cwd(),
  destination = "./src",
  platform = "react-ts",
  skipAtomicBomb = false,
  skipDependencies = false,
  skipResources = false,
  skipUpdate = false,
} = {}) => {
  const configured = fs.existsSync(path.join(cwd, ".atomic-bomb"));
  const commands = [];
  const packages = [
    ...(!skipAtomicBomb ? [latestPackages.atomicBomb] : []),
    ...(!skipResources ? [latestPackages.resources] : []),
  ];

  if (!skipDependencies && packages.length > 0) {
    commands.push(
      getDependencyInstallCommand({
        packageManager: detectPackageManager(cwd),
        packages,
      }),
    );
  }

  if (!skipResources) {
    commands.push({
      command: npxCommand,
      args: ["--yes", latestPackages.resources, destination],
    });
  }

  if (!skipAtomicBomb) {
    if (!configured) {
      commands.push({
        command: npxCommand,
        args: ["--yes", latestPackages.atomicBomb, "--platform", platform],
      });
    } else if (!skipUpdate) {
      commands.push({
        command: npxCommand,
        args: ["--yes", latestPackages.atomicBomb, "--update"],
      });
    }
  }

  return {
    commands,
    configured,
  };
};

export const installAtomicTooling = async ({
  cwd = process.cwd(),
  execute = runCommand,
  ...options
} = {}) => {
  const plan = createInstallPlan({ cwd, ...options });

  for (const item of plan.commands) {
    await execute(item.command, item.args, { cwd });
  }

  return plan;
};
