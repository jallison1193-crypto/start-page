# Start page

A personal browser start page built as a snap grid of widgets: clock, search (Google, Gemini, DuckDuckGo, ChatGPT, Claude), weather, moon and daylight, live SEPTA trains, site groups, projects with GitHub activity, calendar, quick note, tasks and a silent focus timer.

- **Arrange** lets you drag widgets around and pick one of four sizes (Small, Medium, Large, Wide). Everything snaps to the grid.
- **Settings** has theme sets, light, dark, match Windows or a schedule (sunrise to sunset, or set times), accent colors, widget on/off, weather location, train station, GitHub username and backup.

## Theme sets

Each set changes type, widget shapes and the background, not just colors.

| Set | Modes | What it is |
|---|---|---|
| Deep space, Nebula, Aurora, Lunar | Light and dark | Glass panes over drifting dust or a soft glow |
| Paper | Light and dark (Graphite) | Minimal: no boxes, crop marks, big type |
| Fractal | Light and dark | A live, slowly morphing fractal behind smoked glass |
| Phosphor | Dark only | A terminal in your accent color |
| Ashfall | Dark only | Falling ash, rising embers, old-style numerals |

## BrowserOS tasks button

BrowserOS doesn't let websites open its own pages, so on its own the button copies the address for you to paste. To make it open Scheduled Tasks in one click, load the small helper extension once:

1. Open `chrome://extensions` in BrowserOS and turn on **Developer mode**.
2. Click **Load unpacked** and pick the `browseros-helper` folder from this repository.
3. Reload the start page.

## Storage

Everything lives in `index.html`. Your setup is saved in the browser's local storage, so use **Settings > Backup** to keep a copy.

Live at https://jallison1193-crypto.github.io/start-page/
