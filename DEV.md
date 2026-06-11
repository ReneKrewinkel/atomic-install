# Create Atomic Install Development

## Testing

```shell
npm run pack:check
```

## Publishing

The GitHub Actions publish workflow runs on pushes to `main`, version tags,
and manual dispatch. It publishes only when the version in `package.json` is
not already present on npm.

Add a granular npm access token as the repository secret:

```text
NPM_TOKEN
```

The token must have read/write package permission and **Bypass 2FA** enabled.
A normal interactive token can pass `npm whoami` but publishing in GitHub
Actions will fail with `EOTP` because the runner cannot enter an authenticator
code.

The repository is private, so the publish workflow does not use npm
provenance. npm accepts GitHub Actions provenance only when the source
repository is public. Add `--provenance` to the publish command if the
repository is made public later.

The workflows also require:

- `contents: write` for GitHub releases
- `actions: write` for old workflow-run cleanup

These permissions are declared directly in the workflow files.

For a local release:

```shell
npm whoami
npm run deploy
```

`npm run deploy` runs `predeploy`, which validates the package and creates a
patch version commit and tag before pushing with `--follow-tags`.
