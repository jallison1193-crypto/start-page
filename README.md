# Start page

A personal browser start page: swipeable pages of widgets on a snap grid.

Live at https://jallison1193-crypto.github.io/start-page/

## Using it

- **Pages:** swipe, use the left and right arrow keys, or click the tabs at the top. Add a page with +, double-click a tab to rename it, drag tabs to reorder. Turn off **Settings > Pages > Swipe between pages** to stack them and scroll instead.
- **Arrange:** drag widgets, pick one of four sizes, or send a widget to another page.
- **Sites:** each Sites widget has its own groups. Use the pencil on a group to rename or delete it, **+ Group** to add one, **+ Site** to add a link. Add a second Sites widget in Settings to keep Work and Personal apart.
- **Service alerts:** press **Lines** and choose every SEPTA line you ride. The widget stays quiet until one of them has a change or disruption. Press an alert for details, or hide one you've already dealt with.
- **Greeting:** pick a style or write your own lines for each time of day in Settings. Click the greeting for another.

## Widgets

Clock, Search, Weather, Sky, Service alerts, Sites, Quick note, Projects, News, Calendar, Tasks, Focus timer, Prices, Now reading, Course tracker, Prompts, Countdown, Should I?, Weeks remaining, Died on this day, Air quality, Earthquakes, Rocket launches, Space station.

## How it's built

No build step. Open `index.html` through any web server.

| Path | What it holds |
|---|---|
| `css/app.css`, `css/widgets.css` | Styles and theme sets |
| `js/core.js` | Helpers and settings |
| `js/backgrounds.js` | Animated backgrounds |
| `js/app.js` | Core widgets, dialogs and Settings |
| `js/pages.js` | Pages, the snap grid and arranging |
| `js/greetings.js` | Greeting styles |
| `js/alerts.js` | Service alerts and the line list |
| `js/news.js`, `js/prices.js`, `js/extras.js` | Other widgets |
| `scripts/fetch-news.mjs` | Collects headlines into `data/news.json`, run every 30 minutes by GitHub Actions |
| `scripts/fetch-alerts.mjs` | Decodes SEPTA's alerts into `data/alerts.json`, run every 15 minutes by GitHub Actions |

Your setup is saved in the browser's local storage, so use **Settings > Backup** to keep a copy.
