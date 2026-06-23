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
- Atomic Bomb platform: `react-ts-vite`
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
   npx --yes atomic-bomb@latest --platform react-ts-vite
   ```

5. If `.atomic-bomb` exists, runs:

   ```shell
   npx --yes atomic-bomb@latest --update
   ```

6. Asks whether Storybook should be installed with:

   ```shell
   npx sb init
   ```

7. Updates `.storybook/preview.ts`, `.storybook/preview.js`,
   `storybook/preview.ts`, or `storybook/preview.js`, when present, to import
   the generated `resources/styles/main.css` from the configured resource
   destination.
8. Enables the Atomic Bomb component Sass imports in
   `<destination>/resources/styles/main.scss`.
9. Rewrites the generated resource scripts and `.atomic-bomb` component
   destination to use the destination passed to this installer.

The explicit `create-atomic-resources@latest` package specifier is intentional.
It avoids stale `npx` resolution and is used on every resource installation.

## Options

```text
--platform <name>        Atomic Bomb platform (default: react-ts-vite)
--storybook              Install Storybook without prompting
--skip-storybook         Do not install Storybook or prompt
--skip-resources         Do not run create-atomic-resources
--skip-atomic-bomb       Do not install or configure atomic-bomb
--skip-dependencies      Do not add the CLI packages to devDependencies
--skip-update            Do not refresh Atomic Bomb skills when configured
-h, --help               Show help
```

Examples:

```shell
npx create-atomic-install@latest ./src --platform react-ts-vite
npx create-atomic-install@latest ./src --storybook
npx create-atomic-install@latest ./app --skip-atomic-bomb
npx create-atomic-install@latest --skip-resources
```

Atomic Bomb platform setup remains interactive because it can configure an AI
provider.
