# Agent notes: start-page

Josh's personal browser start page: swipeable pages of widgets on a snap grid, plus four art themes. It's a static site with no build step, published on GitHub Pages (see `README.md` for the link and the file map).

## Commands
- Serve locally: `python -m http.server 8137` from the repo root (also the `start-page` server in `.claude/launch.json`), then open `http://localhost:8137/`.
- `scripts/fetch-news.mjs` and `scripts/fetch-alerts.mjs` run on GitHub Actions (`.github/workflows/`). Run them locally with `node scripts/<name>.mjs` only when changing them.

## Done means
1. The page loads with no console errors.
2. The widget or theme you changed works in the browser. Read the page text first; for visual changes, take a screenshot at half scale.
3. Themes stay light: the laptop has integrated graphics, and the last theme audit made them much cheaper to run. Don't undo that.

Report what you checked and what it showed.

## Rules
- Josh's setup lives in the browser's local storage. Never rename or restructure stored settings without migrating the old data, or his setup is lost.
- The live site updates from GitHub. Ask before pushing.
