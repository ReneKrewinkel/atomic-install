import fs from "node:fs";
import path from "node:path";
import {
  detectPackageManager,
  getDependencyInstallCommand,
} from "./package-manager.js";
import { applyPostInstallUpdates } from "./post-install.js";
import { runCommand } from "./runner.js";

const latestPackages = {
  atomicBomb: "atomic-bomb@latest",
  resources: "create-atomic-resources@latest",
};

export const resolvePackageSpecs = ({
  atomicBombPackage = process.env.ATOMIC_BOMB_PACKAGE,
  resourcesPackage = process.env.CREATE_ATOMIC_RESOURCES_PACKAGE,
} = {}) => ({
  atomicBomb: atomicBombPackage || latestPackages.atomicBomb,
  resources: resourcesPackage || latestPackages.resources,
});

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

export const createInstallPlan = ({
  cwd = process.cwd(),
  destination = "./src",
  installStorybook = false,
  platform = "react-ts-vite",
  skipAtomicBomb = false,
  skipDependencies = false,
  skipResources = false,
  skipUpdate = false,
  ...packageOptions
} = {}) => {
  const configured = fs.existsSync(path.join(cwd, ".atomic-bomb"));
  const packageSpecs = resolvePackageSpecs(packageOptions);
  const commands = [];
  const packages = [
    ...(!skipAtomicBomb ? [packageSpecs.atomicBomb] : []),
    ...(!skipResources ? [packageSpecs.resources] : []),
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
      args: ["--yes", packageSpecs.resources, destination],
    });
  }

  if (!skipAtomicBomb) {
    if (!configured) {
      commands.push({
        command: npxCommand,
        args: ["--yes", packageSpecs.atomicBomb, "--platform", platform],
        input: "N\n",
      });
    } else if (!skipUpdate) {
      commands.push({
        command: npxCommand,
        args: ["--yes", packageSpecs.atomicBomb, "--update"],
      });
    }
  }

  if (installStorybook) {
    commands.push({
      command: npxCommand,
      args: ["sb", "init", "--yes", "--no-dev"],
    });
  }

  return {
    commands,
    configured,
    packageSpecs,
  };
};

export const logInstallPlan = ({ commands, packageSpecs }) => {
  console.log("\nAtomic tooling install plan:");
  console.log(`- atomic-bomb: ${packageSpecs.atomicBomb}`);
  console.log(`- create-atomic-resources: ${packageSpecs.resources}`);

  commands.forEach((item, index) => {
    console.log(`${index + 1}. ${item.command} ${item.args.join(" ")}`);
  });
};

export const installAtomicTooling = async ({
  cwd = process.cwd(),
  execute = runCommand,
  logPlan = logInstallPlan,
  postInstall = applyPostInstallUpdates,
  ...options
} = {}) => {
  const plan = createInstallPlan({ cwd, ...options });
  logPlan(plan);

  for (const item of plan.commands) {
    await execute(item.command, item.args, {
      cwd,
      ...(item.input === undefined ? {} : { input: item.input }),
    });
  }

  postInstall({
    cwd,
    destination: options.destination,
  });

  return plan;
};
