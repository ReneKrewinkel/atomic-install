import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parseArgs } from "../src/args.js";
import { shouldInstallStorybook } from "../src/cli.js";
import {
  createInstallPlan,
  installAtomicTooling,
  resolvePackageSpecs,
} from "../src/installer.js";
import {
  addStorybookStylesImport,
  addUseFontHookToApp,
  applyPostInstallUpdates,
  enableAtomicImports,
  isNativeProject,
  updateAtomicBombDestination,
  updateResourceScripts,
} from "../src/post-install.js";

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
    platform: "react-ts-vite",
    skipAtomicBomb: false,
    skipDependencies: false,
    skipResources: false,
    skipStorybook: false,
    skipUpdate: false,
    storybook: false,
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
      skipStorybook: false,
      skipUpdate: true,
      storybook: false,
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
        args: ["--yes", "atomic-bomb@latest", "--platform", "react-ts-vite"],
        input: "N\n",
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
        args: ["--yes", "create-atomic-resources@latest", "./frontend/src"],
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

test("package specs can be overridden for local end-to-end tests", () => {
  const cwd = createProject({ lockfile: "package-lock.json" });

  try {
    const plan = createInstallPlan({
      atomicBombPackage: "/workspace/atomic-bomb",
      cwd,
      resourcesPackage: "/workspace/create-atomic-resources",
    });

    assert.deepEqual(plan.packageSpecs, {
      atomicBomb: "/workspace/atomic-bomb",
      resources: "/workspace/create-atomic-resources",
    });
    assert.deepEqual(plan.commands, [
      {
        command: "npm",
        args: [
          "install",
          "--save-dev",
          "/workspace/atomic-bomb",
          "/workspace/create-atomic-resources",
        ],
      },
      {
        command: process.platform === "win32" ? "npx.cmd" : "npx",
        args: ["--yes", "/workspace/create-atomic-resources", "./src"],
      },
      {
        command: process.platform === "win32" ? "npx.cmd" : "npx",
        args: [
          "--yes",
          "/workspace/atomic-bomb",
          "--platform",
          "react-ts-vite",
        ],
        input: "N\n",
      },
    ]);
  } finally {
    fs.rmSync(cwd, { force: true, recursive: true });
  }
});

test("package specs can be read from environment variables", () => {
  const originalAtomicBombPackage = process.env.ATOMIC_BOMB_PACKAGE;
  const originalResourcesPackage = process.env.CREATE_ATOMIC_RESOURCES_PACKAGE;

  try {
    process.env.ATOMIC_BOMB_PACKAGE = "file:../atomic-bomb";
    process.env.CREATE_ATOMIC_RESOURCES_PACKAGE =
      "file:../create-atomic-resources";

    assert.deepEqual(resolvePackageSpecs(), {
      atomicBomb: "file:../atomic-bomb",
      resources: "file:../create-atomic-resources",
    });
  } finally {
    if (originalAtomicBombPackage === undefined) {
      delete process.env.ATOMIC_BOMB_PACKAGE;
    } else {
      process.env.ATOMIC_BOMB_PACKAGE = originalAtomicBombPackage;
    }

    if (originalResourcesPackage === undefined) {
      delete process.env.CREATE_ATOMIC_RESOURCES_PACKAGE;
    } else {
      process.env.CREATE_ATOMIC_RESOURCES_PACKAGE = originalResourcesPackage;
    }
  }
});

test("executes the plan sequentially in the project root", async () => {
  const cwd = createProject();
  const calls = [];

  try {
    await installAtomicTooling({
      cwd,
      destination: "./src",
      logPlan: () => {},
      postInstall: () => {},
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
    assert.deepEqual(calls[2].options, {
      cwd,
      input: "N\n",
    });
  } finally {
    fs.rmSync(cwd, { force: true, recursive: true });
  }
});

test("adds Storybook initialization to the install plan", () => {
  const cwd = createProject();

  try {
    const plan = createInstallPlan({ cwd, installStorybook: true });
    assert.deepEqual(plan.commands.at(-1), {
      command: process.platform === "win32" ? "npx.cmd" : "npx",
      args: ["sb", "init", "--yes", "--no-dev"],
    });
  } finally {
    fs.rmSync(cwd, { force: true, recursive: true });
  }
});

test("asks whether Storybook should be installed", async () => {
  const questions = [];
  assert.equal(
    await shouldInstallStorybook({
      question: async (message) => {
        questions.push(message);
        return "yes";
      },
    }),
    true,
  );
  assert.deepEqual(questions, ["Install Storybook as well? [y/N]: "]);
  assert.equal(
    await shouldInstallStorybook({
      question: async () => "no",
    }),
    false,
  );
  assert.equal(await shouldInstallStorybook({}), false);
  assert.equal(
    await shouldInstallStorybook({
      skipStorybook: true,
      storybook: true,
    }),
    true,
  );
});

test("post-install updates use the custom resource destination", () => {
  const cwd = createProject();
  const destination = "./frontend/src";
  const stylesDir = path.join(cwd, "frontend", "src", "resources", "styles");
  const previewDir = path.join(cwd, ".storybook");
  fs.mkdirSync(stylesDir, { recursive: true });
  fs.mkdirSync(previewDir, { recursive: true });
  fs.writeFileSync(
    path.join(stylesDir, "main.scss"),
    [
      "@use 'tokens';",
      "",
      "/* Uncomment when using atomic-bomb */",
      "//@use '../../components/atoms';",
      "// @use '../../components/molecules';",
      "//@use '../../components/organisms';",
      "//@use '../../components/templates';",
      "//@use '../../components/pages';",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(previewDir, "preview.ts"),
    "import type { Preview } from '@storybook/react-vite'\n",
  );
  fs.writeFileSync(
    path.join(cwd, ".atomic-bomb"),
    `${JSON.stringify({ destination: "src/components", platform: "react-ts-vite" }, null, 2)}\n`,
  );

  try {
    assert.deepEqual(applyPostInstallUpdates({ cwd, destination }), {
      atomicBombDestinationUpdated: true,
      atomicImportsEnabled: true,
      fontHookAdded: false,
      resourceScriptsUpdated: true,
      storybookImportAdded: true,
    });

    const packageJson = JSON.parse(
      fs.readFileSync(path.join(cwd, "package.json"), "utf8"),
    );
    assert.equal(
      packageJson.scripts.token,
      "json-to-scss ./frontend/src/resources/design/tokens.json ./frontend/src/resources/styles/tokens/_tokens.scss",
    );
    assert.equal(
      packageJson.scripts.scss,
      "sass --quiet ./frontend/src/resources/styles/main.scss ./frontend/src/resources/styles/main.css",
    );
    assert.equal(packageJson.scripts.nice, "prettier -w ./frontend/src/**");

    const atomicBombConfig = JSON.parse(
      fs.readFileSync(path.join(cwd, ".atomic-bomb"), "utf8"),
    );
    assert.equal(atomicBombConfig.destination, "frontend/src/components");

    const preview = fs.readFileSync(
      path.join(previewDir, "preview.ts"),
      "utf8",
    );
    assert.deepEqual(preview.split("\n").slice(0, 2), [
      "import type { Preview } from '@storybook/react-vite'",
      "import '../frontend/src/resources/styles/main.css'",
    ]);

    const mainScss = fs.readFileSync(path.join(stylesDir, "main.scss"), "utf8");
    for (const type of [
      "atoms",
      "molecules",
      "organisms",
      "templates",
      "pages",
    ]) {
      assert.ok(mainScss.includes(`@use '../../components/${type}';`));
      assert.ok(!mainScss.includes(`//@use '../../components/${type}';`));
    }

    assert.equal(enableAtomicImports({ cwd, destination }), false);
    assert.equal(addStorybookStylesImport({ cwd, destination }), false);
    assert.equal(updateAtomicBombDestination({ cwd, destination }), true);
    assert.equal(updateResourceScripts({ cwd, destination }), true);
  } finally {
    fs.rmSync(cwd, { force: true, recursive: true });
  }
});

test("post-install updates Storybook JavaScript preview files", () => {
  const cwd = createProject();
  const destination = "./src";
  const stylesDir = path.join(cwd, "src", "resources", "styles");
  const previewDir = path.join(cwd, "storybook");
  fs.mkdirSync(stylesDir, { recursive: true });
  fs.mkdirSync(previewDir, { recursive: true });
  fs.writeFileSync(
    path.join(previewDir, "preview.js"),
    "import { fn } from 'storybook/test'\n",
  );

  try {
    assert.equal(addStorybookStylesImport({ cwd, destination }), true);

    const preview = fs.readFileSync(
      path.join(previewDir, "preview.js"),
      "utf8",
    );
    assert.deepEqual(preview.split("\n").slice(0, 2), [
      "import { fn } from 'storybook/test'",
      "import '../src/resources/styles/main.css'",
    ]);
  } finally {
    fs.rmSync(cwd, { force: true, recursive: true });
  }
});

test("post-install updates native token script and App font hook", () => {
  const cwd = createProject();
  const destination = "./src";
  fs.writeFileSync(
    path.join(cwd, "package.json"),
    `${JSON.stringify(
      {
        dependencies: {
          expo: "^53.0.0",
          react: "^19.0.0",
        },
        devDependencies: {
          typescript: "^5.0.0",
        },
        scripts: {
          scss: "sass old.scss old.css",
          token: "json-to-scss old.json old.scss",
        },
      },
      null,
      2,
    )}\n`,
  );
  fs.writeFileSync(path.join(cwd, "tsconfig.json"), "{}\n");
  fs.writeFileSync(
    path.join(cwd, "App.tsx"),
    [
      "import { View } from 'react-native'",
      "",
      "const App = () => {",
      "  return <View />",
      "}",
      "",
      "export default App",
      "",
    ].join("\n"),
  );
  fs.mkdirSync(path.join(cwd, "src", "hooks"), { recursive: true });
  fs.writeFileSync(path.join(cwd, "src", "hooks", "index.ts"), "");

  try {
    assert.equal(isNativeProject(cwd), true);
    assert.equal(updateResourceScripts({ cwd, destination }), true);
    assert.equal(addUseFontHookToApp({ cwd, destination }), true);

    const packageJson = JSON.parse(
      fs.readFileSync(path.join(cwd, "package.json"), "utf8"),
    );
    assert.equal(packageJson.scripts.token, undefined);
    assert.equal(packageJson.scripts.scss, undefined);
    assert.equal(
      packageJson.scripts["token:native"],
      "node ./src/resources/scripts/tokens-to-native.mjs",
    );
    assert.equal(
      packageJson.scripts["token-to-native"],
      "node ./src/resources/scripts/tokens-to-native.mjs",
    );
    assert.equal(enableAtomicImports({ cwd, destination }), false);
    assert.equal(addStorybookStylesImport({ cwd, destination }), false);

    const app = fs.readFileSync(path.join(cwd, "App.tsx"), "utf8");
    assert.match(app, /import \{ useFont \} from '\.\/src\/hooks'/u);
    assert.match(app, /const App = \(\) => \{\n  useFont\(\)/u);
    assert.equal(addUseFontHookToApp({ cwd, destination }), false);
  } finally {
    fs.rmSync(cwd, { force: true, recursive: true });
  }
});
