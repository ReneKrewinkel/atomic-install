# Atomic Install

Install and configure
[`create-atomic-resources`](https://github.com/ReneKrewinkel/create-atomic-resources)
and [`atomic-bomb`](https://github.com/ReneKrewinkel/atomic-bomb) together.

## Usage

Run from an application root containing `package.json`:

```shell
npx create-atomic-install@latest ./src
```

Defaults:

- resource destination: `./src`
- Atomic Bomb platform: `react-ts`
- package versions: `@latest`

The equivalent default command is:

```shell
npx create-atomic-install@latest
```

## What It Does

1. Detects npm, Yarn, or pnpm from the project lockfile.
2. Adds `atomic-bomb@latest` and `create-atomic-resources@latest` as development
   dependencies.
3. Runs exactly:

   ```shell
   npx --yes create-atomic-resources@latest ./src
   ```

4. If `.atomic-bomb` is missing, runs:

   ```shell
   npx --yes atomic-bomb@latest --platform react-ts
   ```

5. If `.atomic-bomb` exists, runs:

   ```shell
   npx --yes atomic-bomb@latest --update
   ```

The explicit `create-atomic-resources@latest` package specifier is intentional.
It avoids stale `npx` resolution and is used on every resource installation.

## Options

```text
--platform <name>        Atomic Bomb platform (default: react-ts)
--skip-resources         Do not run create-atomic-resources
--skip-atomic-bomb       Do not install or configure atomic-bomb
--skip-dependencies      Do not add the CLI packages to devDependencies
--skip-update            Do not refresh Atomic Bomb skills when configured
-h, --help               Show help
```

Examples:

```shell
npx create-atomic-install@latest ./src --platform react-ts
npx create-atomic-install@latest ./app --skip-atomic-bomb
npx create-atomic-install@latest --skip-resources
```

Atomic Bomb platform setup remains interactive because it can configure an AI
provider.
