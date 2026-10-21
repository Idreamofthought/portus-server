# Contributing to Portus

This guide keeps changes organised for the project and for future-you.

## Local Setup

```bash
npm install
npm start
```

The development server runs at `http://localhost:8080`. Copy `.env.example` to
`.env` for local configuration and keep secrets out of Git.

## Running Tests

```bash
npm test
npm run test:integration
npm run validate:structure
```

Use `npm run test:launch-sandbox` only when the launch sandbox environment is
configured and the opt-in checks are intended.

## Commit Workflow

```bash
git status
git diff
git add path/to/changed-file
git commit -m "Describe your change"
git push origin main
```

Keep commits focused. Do not commit `.env`, credentials, or local database
artifacts.

## Folder Structure

```text
server.js, auth.js, middleware.js  server and account modules
protected/                         paid game client and modules
public/                            public client and account pages
portus/, data/                     canonical game content and catalogs
homepage/                          public site and writing tree
test/                              unit, sandbox, and integration tests
docs/                              system and worldbuilding documentation
```

## Coding Style

- Follow the existing JavaScript and Markdown style.
- Keep functions small and behavior testable.
- Keep lore and design notes in `docs/`, `lore/`, or `portus/` according to their purpose.
- Update tests and documentation when behavior or public contracts change.

## Documentation

Start with [`docs/README.md`](docs/README.md) for the documentation index and
[`README.md`](README.md) for the repository overview.