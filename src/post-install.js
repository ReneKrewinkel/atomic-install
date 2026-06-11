import fs from "node:fs";
import path from "node:path";

const atomicImports = [
  "@use '../../components/atoms';",
  "@use '../../components/molecules';",
  "@use '../../components/organisms';",
  "@use '../../components/templates';",
  "@use '../../components/pages';",
];

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
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts.token =
    `json-to-scss ${projectPath(target, "resources/design/tokens.json")} ${projectPath(target, "resources/styles/tokens/_tokens.scss")}`;
  packageJson.scripts.scss =
    `sass --quiet ${projectPath(target, "resources/styles/main.scss")} ${projectPath(target, "resources/styles/main.css")}`;
  packageJson.scripts.nice = `prettier -w ${projectPath(target, "**")}`;
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
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
  config.destination =
    target === "." ? "components" : `${target}/components`;
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  return true;
};

export const enableAtomicImports = ({
  cwd = process.cwd(),
  destination = "./src",
} = {}) => {
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
  const previewPath = path.join(cwd, ".storybook", "preview.ts");
  if (!fs.existsSync(previewPath)) return false;

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

  fs.writeFileSync(previewPath, `${statement}\n${original}`);
  return true;
};

export const applyPostInstallUpdates = (options = {}) => ({
  atomicBombDestinationUpdated: updateAtomicBombDestination(options),
  atomicImportsEnabled: enableAtomicImports(options),
  resourceScriptsUpdated: updateResourceScripts(options),
  storybookImportAdded: addStorybookStylesImport(options),
});
