# Contributing to frontier-atlas

Start with the local setup in [README.md](README.md). Before building a large feature, open an issue describing the problem and a small proposed change.

## Useful first contributions

- Add a synthetic connector fixture for a documented public API response.
- Explain one economics-model input and its units.
- Improve keyboard navigation or a chart empty state.

## Workflow

1. Fork the repository and create a focused branch.
2. Reproduce the problem with public or synthetic input.
3. Make the smallest useful change and update the relevant documentation.
4. Run the relevant checks: `uv run pytest from services/api after installing the dev dependencies; npm run typecheck from apps/web after npm ci`.
5. Open a pull request explaining the problem, the result, and what you actually tested. Include screenshots for visible UI changes.

Do not include credentials, customer records, private messages or paid content you do not have permission to redistribute. Mark modeled assumptions and synthetic examples clearly. Never report guessed metrics as measured results.

No response-time commitment is implied. Please keep discussion specific, constructive and respectful.
