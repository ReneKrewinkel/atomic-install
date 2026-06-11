import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parseArgs } from "../src/args.js";
import { createInstallPlan, installAtomicTooling } from "../src/installer.js";

const createProject = ({ configured = false, lockfile } = {}) => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "atomic-install-"));
  fs.writeFileSync(path.join(cwd, "package.json"), "{}\n");
  if (configured) fs.writeFileSync(path.join(cwd, ".atomic-bomb"), "{}\n");
  if (lockfile) fs.writeFileSync(path.join(cwd, lockfile), "");
  return cwd;
};

test("parses defaults and options", () => {
  assert.deepEqual(parseArgs([]), {
    destination: "./src",
    help: false,
    platform: "react-ts",
    skipAtomicBomb: false,
    skipDependencies: false,
    skipResources: false,
    skipUpdate: false,
  });

  assert.deepEqual(
    parseArgs(["./app", "--platform", "react-native", "--skip-update"]),
    {
      destination: "./app",
      help: false,
      platform: "react-native",
      skipAtomicBomb: false,
      skipDependencies: false,
      skipResources: false,
      skipUpdate: true,
    },
  );
});

test("first install pins both packages and explicitly runs latest resources", () => {
  const cwd = createProject({ lockfile: "yarn.lock" });

  try {
    const plan = createInstallPlan({ cwd });

    assert.deepEqual(plan.commands, [
      {
        command: "yarn",
        args: [
          "add",
          "-D",
          "atomic-bomb@latest",
          "create-atomic-resources@latest",
        ],
      },
      {
        command: process.platform === "win32" ? "npx.cmd" : "npx",
        args: ["--yes", "create-atomic-resources@latest", "./src"],
      },
      {
        command: process.platform === "win32" ? "npx.cmd" : "npx",
        args: [
          "--yes",
          "atomic-bomb@latest",
          "--platform",
          "react-ts",
        ],
      },
    ]);
  } finally {
    fs.rmSync(cwd, { force: true, recursive: true });
  }
});

test("configured projects refresh skills instead of reconfiguring", () => {
  const cwd = createProject({ configured: true, lockfile: "pnpm-lock.yaml" });

  try {
    const plan = createInstallPlan({
      cwd,
      destination: "./frontend/src",
      skipDependencies: true,
    });

    assert.deepEqual(plan.commands, [
      {
        command: process.platform === "win32" ? "npx.cmd" : "npx",
        args: [
          "--yes",
          "create-atomic-resources@latest",
          "./frontend/src",
        ],
      },
      {
        command: process.platform === "win32" ? "npx.cmd" : "npx",
        args: ["--yes", "atomic-bomb@latest", "--update"],
      },
    ]);
  } finally {
    fs.rmSync(cwd, { force: true, recursive: true });
  }
});

test("executes the plan sequentially in the project root", async () => {
  const cwd = createProject();
  const calls = [];

  try {
    await installAtomicTooling({
      cwd,
      destination: "./src",
      execute: async (command, args, options) => {
        calls.push({ command, args, options });
      },
    });

    assert.equal(calls.length, 3);
    assert.ok(
      calls.every((call) => call.options.cwd === cwd),
      "every command should run from the target project root",
    );
    assert.deepEqual(calls[1].args, [
      "--yes",
      "create-atomic-resources@latest",
      "./src",
    ]);
  } finally {
    fs.rmSync(cwd, { force: true, recursive: true });
  }
});
