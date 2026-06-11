# Create Atomic Install Development

## Testing

```shell
npm run pack:check
```

## Publishing

The GitHub Actions publish workflow runs on pushes to `main`, version tags,
and manual dispatch. It publishes only when the version in `package.json` is
not already present on npm.

Add an npm automation or granular access token as the repository secret:

```text
NPM_TOKEN
```

For a local release:

```shell
npm whoami
npm run deploy
```

`npm run deploy` runs `predeploy`, which validates the package and creates a
patch version commit and tag before pushing with `--follow-tags`.
