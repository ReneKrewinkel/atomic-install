import fs from "node:fs";
import path from "node:path";

const atomicImports = [
  "@use '../../components/atoms';",
  "@use '../../components/molecules';",
  "@use '../../components/organisms';",
  "@use '../../components/templates';",
  "@use '../../components/pages';",
];

const dependencyGroups = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

const nativePackages = new Set(["expo", "react-native"]);

export const normalizeDestination = (destination) => {
  const normalized = destination.replaceAll("\\", "/").replace(/\/+$/u, "");
  return normalized.replace(/^\.\//u, "") || ".";
};

const projectRelativeDestination = ({ cwd, destination }) => {
  const absolute = path.resolve(cwd, destination);
  const relative = path.relative(cwd, absolute).replaceAll(path.sep, "/");
  return relative || ".";
};

const projectPath = (destination, suffix) =>
  destination === "." ? `./${suffix}` : `./${destination}/${suffix}`;

export const isNativeProject = (cwd = process.cwd()) => {
  const packageJsonPath = path.join(cwd, "package.json");
  if (!fs.existsSync(packageJsonPath)) return false;

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  return dependencyGroups
    .map((group) => packageJson[group])
    .filter(Boolean)
    .some((dependencies) =>
      Object.keys(dependencies).some((name) => nativePackages.has(name)),
    );
};

const usesTypeScript = (cwd = process.cwd()) => {
  const packageJsonPath = path.join(cwd, "package.json");
  if (fs.existsSync(path.join(cwd, "tsconfig.json"))) return true;
  if (!fs.existsSync(packageJsonPath)) return false;

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  return dependencyGroups
    .map((group) => packageJson[group])
    .filter(Boolean)
    .some((dependencies) => Boolean(dependencies.typescript));
};

const relativeImportPath = ({ fromFile, toFile }) => {
  let result = path
    .relative(path.dirname(fromFile), toFile)
    .replaceAll(path.sep, "/");
  if (!result.startsWith(".")) result = `./${result}`;
  return result;
};

export const updateResourceScripts = ({
  cwd = process.cwd(),
  destination = "./src",
} = {}) => {
  const packageJsonPath = path.join(cwd, "package.json");
  if (!fs.existsSync(packageJsonPath)) return false;

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const target = projectRelativeDestination({ cwd, destination });
  const nativeProject = isNativeProject(cwd);
  packageJson.scripts = packageJson.scripts || {};
  if (nativeProject) {
    delete packageJson.scripts.token;
    delete packageJson.scripts.scss;
    const nativeTokenCommand = `node ${projectPath(target, "resources/scripts/tokens-to-native.mjs")}`;
    packageJson.scripts["token:native"] = nativeTokenCommand;
    packageJson.scripts["token-to-native"] = nativeTokenCommand;
  } else {
    packageJson.scripts.token = `json-to-scss ${projectPath(target, "resources/design/tokens.json")} ${projectPath(target, "resources/styles/tokens/_tokens.scss")}`;
    packageJson.scripts.scss = `sass --quiet ${projectPath(target, "resources/styles/main.scss")} ${projectPath(target, "resources/styles/main.css")}`;
  }
  packageJson.scripts.nice = `prettier -w ${projectPath(target, "**")}`;
  fs.writeFileSync(
    packageJsonPath,
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );
  return true;
};

export const updateAtomicBombDestination = ({
  cwd = process.cwd(),
  destination = "./src",
} = {}) => {
  const configPath = path.join(cwd, ".atomic-bomb");
  if (!fs.existsSync(configPath)) return false;

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const target = projectRelativeDestination({ cwd, destination });
  config.destination = target === "." ? "components" : `${target}/components`;
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  return true;
};

export const enableAtomicImports = ({
  cwd = process.cwd(),
  destination = "./src",
} = {}) => {
  if (isNativeProject(cwd)) return false;

  const mainScssPath = path.resolve(
    cwd,
    destination,
    "resources",
    "styles",
    "main.scss",
  );
  if (!fs.existsSync(mainScssPath)) return false;

  const original = fs.readFileSync(mainScssPath, "utf8");
  let updated = original;
  for (const statement of atomicImports) {
    const escaped = statement.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    updated = updated.replace(
      new RegExp(`^\\s*//\\s*${escaped}\\s*$`, "gmu"),
      statement,
    );
  }

  if (updated === original) return false;
  fs.writeFileSync(mainScssPath, updated);
  return true;
};

export const addStorybookStylesImport = ({
  cwd = process.cwd(),
  destination = "./src",
} = {}) => {
  if (isNativeProject(cwd)) return false;

  const previewPath = [
    path.join(cwd, ".storybook", "preview.ts"),
    path.join(cwd, ".storybook", "preview.js"),
    path.join(cwd, "storybook", "preview.ts"),
    path.join(cwd, "storybook", "preview.js"),
  ].find((candidate) => fs.existsSync(candidate));

  if (!previewPath) return false;

  const cssPath = path.resolve(
    cwd,
    destination,
    "resources",
    "styles",
    "main.css",
  );
  const importPath = relativeImportPath({
    fromFile: previewPath,
    toFile: cssPath,
  });
  const statement = `import '${importPath}'`;
  const original = fs.readFileSync(previewPath, "utf8");

  if (
    original.includes(`'${importPath}'`) ||
    original.includes(`"${importPath}"`)
  ) {
    return false;
  }

  const firstLineBreak = original.indexOf("\n");
  const updated =
    firstLineBreak === -1
      ? `${original}\n${statement}\n`
      : `${original.slice(0, firstLineBreak + 1)}${statement}\n${original.slice(firstLineBreak + 1)}`;

  fs.writeFileSync(previewPath, updated);
  return true;
};

const findAppFile = (cwd) =>
  [
    "App.tsx",
    "App.ts",
    "App.jsx",
    "App.js",
    path.join("src", "App.tsx"),
    path.join("src", "App.ts"),
    path.join("src", "App.jsx"),
    path.join("src", "App.js"),
  ]
    .map((candidate) => path.join(cwd, candidate))
    .find((candidate) => fs.existsSync(candidate));

const insertImport = ({ content, statement }) => {
  if (content.includes(statement)) return content;

  const lines = content.split("\n");
  const lastImportIndex = lines.reduce(
    (lastIndex, line, index) =>
      line.trim().startsWith("import ") ? index : lastIndex,
    -1,
  );

  if (lastImportIndex === -1) return `${statement}\n${content}`;

  lines.splice(lastImportIndex + 1, 0, statement);
  return lines.join("\n");
};

const insertHookCall = (content) => {
  if (content.includes("useFont()")) return content;

  const updated = content.replace(
    /(const\s+App\s*=\s*\([^)]*\)\s*=>\s*\{)|(function\s+App\s*\([^)]*\)\s*\{)|(export\s+default\s+function\s+App\s*\([^)]*\)\s*\{)/u,
    (match) => `${match}\n  useFont()\n`,
  );

  return updated;
};

export const addUseFontHookToApp = ({
  cwd = process.cwd(),
  destination = "./src",
} = {}) => {
  if (!isNativeProject(cwd)) return false;

  const appPath = findAppFile(cwd);
  if (!appPath) return false;

  const target = projectRelativeDestination({ cwd, destination });
  const extension = usesTypeScript(cwd) ? "ts" : "js";
  const hookIndexPath = path.resolve(
    cwd,
    target,
    "hooks",
    `index.${extension}`,
  );
  if (!fs.existsSync(hookIndexPath)) return false;

  const original = fs.readFileSync(appPath, "utf8");
  const hookDirPath = path.dirname(hookIndexPath);
  const importPath = relativeImportPath({
    fromFile: appPath,
    toFile: hookDirPath,
  });
  const withHook = insertHookCall(original);
  if (withHook === original && !original.includes("useFont()")) return false;

  const statement = `import { useFont } from '${importPath}'`;
  const updated = insertImport({ content: withHook, statement });

  if (updated === original) return false;
  fs.writeFileSync(appPath, updated);
  return true;
};

export const applyPostInstallUpdates = (options = {}) => ({
  atomicBombDestinationUpdated: updateAtomicBombDestination(options),
  atomicImportsEnabled: enableAtomicImports(options),
  fontHookAdded: addUseFontHookToApp(options),
  resourceScriptsUpdated: updateResourceScripts(options),
  storybookImportAdded: addStorybookStylesImport(options),
});
