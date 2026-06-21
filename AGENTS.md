# Mundial2026 — Polla app

## Tech stack
- **Desktop shell**: Electron 28 + better-sqlite3 (SQLite via single `settings` key-value table)
- **Browser fallback**: localStorage + `data/*.json` files (open `pages/*.html` directly)
- **Vanilla JS** (no framework). CSS variables for theming. Chart.js on statistics page.

## Dual-mode data layer (`js/config.js`)
- `loadData(baseName)` reads from Electron IPC first, then falls back to `fetch('data/<name>.json')`
- `saveToStorage(key, val)` / `loadFromStorage(key)` writes to Electron IPC or localStorage
- `APP_MODE` from `?mode=test` URL param loads `*_test.json` files instead of production
- Test data files: `bets_test.json`, `knockout_test.json`, `matches_test.json`, `standings_test.json`, `users_test.json`

## Entrypoints
- `main.js` — Electron main process; creates window, registers IPC handlers for `db:*`
- `preload.js` — exposes `window.api` (getData, saveData, exportAll, importAll, resetDatabase)
- `index.html` — home page (loaded by Electron by default). All other pages under `pages/`
- Each page loads: `config.js` → `theme.js` → page-specific `*Init.js` (in that order)

## Page → init script mapping
| Page | Init script |
|------|------------|
| index.html | `js/homeInit.js` |
| pages/group-stage.html | `js/groupStageInit.js` |
| pages/knockout-stage.html | `js/knockoutInit.js` |
| pages/statistics.html | `js/statisticsInit.js` |
| pages/users.html | `js/usersInit.js` |
| pages/bet-form.html | `js/betFormInit.js` |

## Models (`models/`, ES modules) vs server modules (`modules/`)
- `models/*.js` use `export class` (ES modules) — used by browser-side code
- `modules/groupStage.js` uses `require()` (CommonJS, Node.js) — server-side only, not used in browser
- `modules/knockoutStage.js` and `modules/statistics.js` use `import/export` (ES modules, browser)
- The Node-side code in `modules/` is **not actively wired** to the Electron renderer; the browser-side init scripts in `js/` do all rendering

## Scoring system
| Phase | Points/hit |
|-------|-----------|
| R32 (round32) | 5 |
| R16 (round16) | 10 |
| QF (quarterfinals) | 20 |
| SF (semifinals) | 30 |
| Finalists | 40 |
| 4th place | 40 |
| 3rd place | 50 |
| Runner-up | 60 |
| Champion | 70 |

## Bet validation rules (enforced in `js/betFormInit.js`)
- R32: exactly 32 teams
- R16: exactly 16 teams
- QF: exactly 8 teams
- Podium (champion, runner-up, 3rd, 4th): all 4 must be distinct (no duplicates)

## Commands
```
npm start        # electron .
npm run dev      # same as start
npm run init     # node init_data.js (creates empty JSON files in data/)
node migrate-bets.js  # parses HTML bet report, writes users.json/bets.json
```

## Theme
- Dark/light toggle stored in `localStorage` key `mundial2026_theme`
- `js/theme.js` applies saved theme synchronously (before DOMContentLoaded) to avoid flash
- Toggle button id: `#themeBtn`

## Export/Import
- Export: `window.exportTournamentData()` — downloads `backup_polla_2026.json`
- Import: `window.importTournamentData(jsonString)` — reads backup, reloads page
- CSV export: `statistics.html` `#exportCsv` button — downloads `ranking_polla_2026.csv`

## Knockout bracket resolution
- Bracket stored in `knockout.json` with `roundOf32`, `roundOf16`, `quarterFinals`, `semiFinals`, `thirdPlace`, `final`
- Sources resolved via `resolveSource()`: `W<id>` = winner of match id, `L<id>` = loser, `1A`/`2B` = group position
- Group standings computed on-the-fly from played matches; only teams with `played > 0` qualify

## Notable quirks
- `init_data.js` creates empty JSON files but **the app seeds from them only on first Electron launch** (empty DB check)
- Electron DB seed reads from `data/teams.json`, `groups.json`, `matches.json`, `knockout.json`, `users.json`, `bets.json`
- `matches-scores` and `knockout-results` are stored as separate DB keys — merge happens in `getData()`
- User IDs are `Date.now()` timestamps (not sequential)
- No test runner configured (`npm test` not defined)
- `migrate-bets.js` has a hardcoded path (`C:/Users/User/Downloads/...`) — must be updated per machine
