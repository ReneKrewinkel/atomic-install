export const usage = `Usage: create-atomic-install [destination] [options]

Arguments:
  destination              Resource destination directory (default: ./src)

Options:
  --platform <name>        Atomic Bomb platform (default: react-ts)
  --skip-resources         Do not run create-atomic-resources
  --skip-atomic-bomb       Do not install or configure atomic-bomb
  --skip-dependencies      Do not add the CLI packages to devDependencies
  --skip-update            Do not refresh Atomic Bomb skills when configured
  -h, --help               Show this help`;

export const parseArgs = (args) => {
  const options = {
    destination: "./src",
    help: false,
    platform: "react-ts",
    skipAtomicBomb: false,
    skipDependencies: false,
    skipResources: false,
    skipUpdate: false,
  };
  let destinationSet = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--skip-resources") {
      options.skipResources = true;
      continue;
    }
    if (arg === "--skip-atomic-bomb") {
      options.skipAtomicBomb = true;
      continue;
    }
    if (arg === "--skip-dependencies") {
      options.skipDependencies = true;
      continue;
    }
    if (arg === "--skip-update") {
      options.skipUpdate = true;
      continue;
    }
    if (arg === "--platform") {
      const platform = args[index + 1];
      if (!platform || platform.startsWith("-")) {
        throw new Error("--platform requires a value.");
      }
      options.platform = platform;
      index += 1;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    if (destinationSet) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    options.destination = arg;
    destinationSet = true;
  }

  if (options.skipResources && options.skipAtomicBomb) {
    throw new Error(
      "--skip-resources and --skip-atomic-bomb leave nothing to install.",
    );
  }

  return options;
};
