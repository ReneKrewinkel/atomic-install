import fs from "node:fs";
import path from "node:path";

export const detectPackageManager = (cwd = process.cwd()) => {
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  return "npm";
};

export const getDependencyInstallCommand = ({
  packageManager,
  packages,
}) => {
  if (packageManager === "pnpm") {
    return {
      command: "pnpm",
      args: ["add", "-D", ...packages],
    };
  }
  if (packageManager === "yarn") {
    return {
      command: "yarn",
      args: ["add", "-D", ...packages],
    };
  }
  return {
    command: "npm",
    args: ["install", "--save-dev", ...packages],
  };
};
