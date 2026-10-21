# Developer Guide

## Running Locally

```bash
npm install
npm start
```

The server runs at `http://localhost:8080` by default. Copy `.env.example` to
`.env` and provide local values as needed; never commit `.env`.

## Running Tests

```bash
npm test
npm run test:integration
npm run validate:structure
```

The launch sandbox is opt-in:

```bash
npm run test:launch-sandbox
```

## Editing Files

Open the repository in VS Code with `code .`. Keep server logic in the root
modules and `routes/`, browser game code in `protected/`, runtime content in
`portus/` and `data/`, and tests in `test/`.

## Git Workflow

```bash
git status
git add path/to/changed-file
git commit -m "Describe your change"
git push origin main
```

Review the diff before committing and do not add credentials or generated
database files.