<div align="center">

<img src="resources/icon.png" width="96" alt="Plainlist icon">

# Plainlist

**A fast, fully offline to-do app for Windows.**
Type tasks the way you'd say them; Plainlist figures out the date, time, priority, people and area.

![Windows 10/11](https://img.shields.io/badge/Windows-10%20%7C%2011-0078D6?logo=windows&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-47848F?logo=electron&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Offline](https://img.shields.io/badge/network-none-2ea44f)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

<img src="docs/screenshots/list.png" alt="Plainlist: all tasks grouped by due date" width="900">

</div>

> The interface and the quick-entry language are **Italian**. Everything runs locally: no account, no cloud, no network calls.

## Features

- ⚡ **Quick entry in plain language**: `Mandare preventivo @Marco venerdì alle 12 #lavoro !alta`, with a live preview as you type
- 🗂️ **Grouped by due date**: Overdue / Today / Next 7 days / Later / No date / Completed
- ☀️ **My Day**: pick what to do today, see estimated load against your working hours, get suggestions
- 🔁 **Recurring tasks**: `ogni lunedì`, `ogni 5 del mese`, `ogni 7 giorni dal completamento`
- 👥 **People & 1:1s**: everything about one person, what you're waiting on from them, a summary ready to paste
- ⏳ **Waiting** (`+attesa`) and **Scheduled** tasks (`da lunedì`: hidden until that day)
- ⏱️ **Estimates** (`~30m`, `~2h`)
- 📋 **Update**: a status summary with a suggestion on what to tackle first, copyable as text
- 💾 **Daily automatic backup** to any folder (OneDrive works too)
- 🖥️ Starts with Windows, lives in the tray, global hotkey for quick add, native notifications
- 🌗 Light and dark theme, following Windows
- 🔒 **No network at all**: data stays in a local SQLite database

## Screenshots

| | |
|---|---|
| <img src="docs/screenshots/quick-add.png" alt="Quick entry with live preview"><br>**Quick entry**: the preview shows what was understood | <img src="docs/screenshots/my-day.png" alt="My Day view"><br>**My Day**: today's plan, workload bar and suggestions |
| <img src="docs/screenshots/update.png" alt="Update summary"><br>**Update**: a summary you can copy and share | <img src="docs/screenshots/person.png" alt="Person view"><br>**People**: everything about one person, ready for a 1:1 |
| <img src="docs/screenshots/detail.png" alt="Task detail panel"><br>**Details**: due date, repetition, priority, estimate | <img src="docs/screenshots/dark.png" alt="Dark theme"><br>**Dark theme** |

## Quick-entry syntax

Write the task freely; recognised parts are removed from the title. Anything not recognised stays in the title and is highlighted in the preview.

| Element | Syntax | Example |
|---|---|---|
| Priority | `!alta` `!media` `!bassa`, or `!!!` `!!` `!` | `Report !!!` |
| Area | `#name` (the first one; created if missing). Without `#`: **lavoro**, changeable in Settings › Default area | `#casa` |
| People | `@Name`, `@Name_Surname` | `@Anna_Bianchi` |
| Tag | `+tag` | `+urgente` |
| Waiting on others | `+attesa` (not stored as a tag) | `Budget da @Marco +attesa` |
| Estimate | `~30m`, `~45min`, `~2h`, `~1,5h`, `~1h30` | `Report ~1h` |
| Visible from | `da` / `dal` / `a partire da` + a date | `Bilancio da lunedì`, `Ferie dal 15` |
| Repetition | see below | `ogni lunedì` |
| Literal text | in quotes, never interpreted | `Leggere "fine mese"` |

People are removed from the title unless they follow a preposition: `Budget Q4 da @Marco` becomes "Budget Q4 da Marco", `Pranzo con @Marco e @Anna` becomes "Pranzo con Marco e Anna".

**Dates and times**

| Type | Meaning |
|---|---|
| `oggi`, `domani`, `dopodomani` | today, tomorrow, the day after |
| `venerdì`, `venerdì prossimo`, `prossimo venerdì` | the next Friday, **today excluded** (said on a Friday = in 7 days) |
| `tra 3 giorni`, `fra una settimana`, `tra 2 mesi` | in 3 days, in a week, in 2 months |
| `settimana prossima` | Monday of next week |
| `fine settimana`, `weekend` | Saturday |
| `fine mese`, `fine mese prossimo`, `mese prossimo`, `fine anno` | end of month, end of next month, next month, end of year |
| `15/10`, `15/10/2027`, `15 ottobre`, `1° dic`, `2026-10-15` | without a year: the next occurrence (next year if already past) |
| `il 15`, `l'11` | the next 15th / 11th of the month |
| `alle 15`, `alle 9:30`, `ore 15.30`, `15:30`, `a mezzogiorno` | `alle 1`…`alle 7` = afternoon; a time alone = today, or tomorrow if already past |

Prepositions before a date are absorbed: `entro venerdì`, `per il 15 ottobre`, `di lunedì`. Bare numbers are never dates (`Comprare 3 mele`).

**Repetitions**

| Type | Meaning |
|---|---|
| `ogni giorno`, `tutti i giorni` | every day |
| `ogni giorno lavorativo`, `nei giorni lavorativi` | Monday to Friday |
| `ogni lunedì`, `ogni lunedì e giovedì`, `tutti i sabati` | on those weekdays |
| `ogni settimana`, `ogni 2 settimane`, `ogni 15 giorni` | every week, every 2 weeks, every 15 days |
| `ogni mese`, `ogni mese il 5`, `ogni 5 del mese`, `ogni fine mese` | monthly |
| `ogni anno`, `ogni 3 mesi` | yearly, quarterly |
| … `dal completamento`, … `dopo il completamento`, … `dopo` | the next date counts from the day you complete the task |

Without a date, a recurring task starts at its first valid occurrence. Completing it creates the next one: if you completed it late, the new date is the first one after today, with no backlog. If you reopen an occurrence completed by mistake, the generated one disappears.

**Examples** (today = Thursday 24 September 2026)

| Input | Result |
|---|---|
| `Mandare preventivo @Marco venerdì alle 12 #lavoro !alta` | Fri 25 Sep 12:00 · high · lavoro · Marco |
| `Prenotare veterinario settimana prossima` | Mon 28 Sep |
| `Pagare bollette entro fine mese #casa !!!` | Wed 30 Sep · high · casa |
| `Dichiarazione 15/01` | Fri 15 Jan 2027 |
| `Stand-up giovedì` | Thu 1 Oct (not today) |
| `Pagare fattura 31/02` | no date; "31/02" stays in the title and is flagged |
| `Revisione KPI @Marco ogni lunedì alle 9 ~1h !alta` | Mon 28 Sep 09:00, every Monday · ~1h · high |
| `Bilancio da lunedì entro 15/10` | hidden until Mon 28 Sep, due Thu 15 Oct |

## Views

- **My Day** (Il mio giorno): the tasks you picked for today, with a bar comparing estimates to your available hours (Settings › Working hours per day) and suggestions: overdue, due today, due tomorrow, high priority. Add tasks with the ☀ icon, by dragging onto the sidebar entry, or from the suggestions. It empties itself every day; the morning summary notification opens this view.
- **Waiting** (In attesa): delegated tasks or tasks waiting on others; never suggested as something to do.
- **Scheduled** (Programmati): tasks hidden until a date; they reappear on their own that day.
- **People** (sidebar): for each person, what you're waiting on from them, open tasks by due date, and what was completed in the last 14 days. "Copia per il 1:1" copies a summary to paste.
- **Update**: the "Copia" button copies the summary as text, with the current filters applied.

## Keyboard shortcuts

| Keys | Action |
|---|---|
| `Ctrl+Alt+Space` (configurable) | Quick add from any program |
| `Ctrl+N` / `Ctrl+Shift+N` | Quick entry / full form |
| `Ctrl+F` | Search |
| `Ctrl+U` | Update |
| `↑` `↓`, `Enter` | Move through the list, open details |
| `Space` / `Del` | Complete / delete (with undo) |
| `Esc` | Close details |

If the global hotkey is already taken by another program, Plainlist tells you and you can pick a different one in Settings.

## Your data

- Tasks live in `%APPDATA%\Plainlist\tasks.db` (Settings › Data › Open folder).
- Before every import, and before an update changes the database structure, a copy is saved in `%APPDATA%\Plainlist\backups\`.
- **Automatic backup**: every day the app saves everything to `plainlist-YYYY-MM-DD.json` (same format as Export, re-importable from Settings › Data › Import) and keeps the last 14 files. The default folder is `Documents\Plainlist Backup`; in Settings › Automatic backup you can choose another one, for example inside OneDrive. The app only writes to disk and OneDrive does the syncing. If a backup fails, you get a notification at most once a day.
- Uninstalling does **not** delete your data.

## Install

`npm run dist` produces `dist/Plainlist-Setup-<version>.exe`:

- installs for the current user in `%LOCALAPPDATA%\Programs\Plainlist`, no admin rights needed
- adds a Start menu shortcut
- uninstall from Windows Settings › Apps

The installer is not signed, so SmartScreen may warn on first run ("More info" › "Run anyway").

**Updating**: bump the version (`npm version minor`), run `npm run dist` and launch the new installer. It replaces the program and leaves your data alone; on first start the new version migrates the database if needed. If you accidentally install a version older than the one that created your data, the app stops with a message instead of opening it.

## Development

Requirements: Windows 10/11 x64, Node.js 20 or newer (22 LTS recommended). No Visual Studio Build Tools needed: `better-sqlite3` ships prebuilt N-API binaries that work for both Node and Electron. The installed app doesn't need Node; Electron brings its own runtime.

```bash
npm install
npm run dev
```

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Run the app in development with hot reload |
| `npm test` | Run the tests (Vitest) inside Electron's runtime, the same one the app uses |
| `npm run typecheck` | Type-check main, preload and renderer |
| `npm run build` | Type-check and build main, preload and renderer into `out/` |
| `npm run dist` | Build + NSIS installer in `dist/Plainlist-Setup-<version>.exe` |
| `node scripts/make-icons.mjs` | Regenerate `resources/icon.ico` and `resources/icon.png` |
| `npx electron scripts/screenshots.cjs` | Regenerate the README screenshots (after `npm run build`), using demo data in a temporary folder |

### Architecture

```
src/
├─ core/        pure logic, no Electron or database: parser, dates, recurrence, grouping,
│               sorting, summary, My Day, person view, copyable text
├─ shared/      shared types and the typed IPC contract (ipc.ts)
├─ main/        main process
│  ├─ data/     SQLite: migrations, repositories, JSON backup
│  ├─ services/ application logic used by the IPC handlers (testable without Electron)
│  ├─ ipc/      handler registration; errors travel as data
│  ├─ system/   tray, autostart, global hotkey, notifications, reminder scheduler, auto backup
│  └─ windows/  main window, quick add, security (CSP, network block)
├─ preload/     exposes window.api via contextBridge, only on declared channels
└─ renderer/    React + Tailwind
```

**Security**: `contextIsolation` on, `nodeIntegration` off, `sandbox` on, Content Security Policy in the build, navigation and new windows blocked, every http/https request blocked (in development only the Vite dev server is allowed). The renderer never touches the filesystem or the database: everything goes through the contract in `src/shared/ipc.ts`.

Tailwind keeps colours as CSS variables, so light/dark theme is a single media query that Electron ties to `nativeTheme`.

The schema already supports subtasks (`tasks.parent_id`). To change the schema, add a migration in `src/main/data/migrations/` with an increasing version; never edit one that has been released.

### Extending the parser

Each expression is an independent rule in `src/core/parser/rules/`. To add one, for example `stasera` ("tonight") as a synonym for today:

1. Create `src/core/parser/rules/tonight.ts`:

   ```ts
   import { defineRule, wordAt } from '../types'

   export const tonight = defineRule({
     id: 'tonight',
     kind: 'date',
     match(tokens, i, ctx) {
       return wordAt(tokens, i) === 'stasera' ? { length: 1, status: 'ok', value: ctx.today } : null
     }
   })
   ```

2. Add it to `DEFAULT_RULES` in `src/core/parser/rules/index.ts`.
3. Add test cases in `tests/parser.dates.test.ts` or `tests/parser.syntax.test.ts`.

How a rule works:

- `match(tokens, i, ctx)` gets the tokens (with `word` already lowercased and without accents) and the current position. It returns `null` if nothing matches, otherwise how many tokens it consumes and the value.
- `kind` can be `date`, `time`, `priority`, `area`, `person`, `tag`, `recurrence`, `estimate` or `waiting`. The start date has no rules of its own: the parser derives it from `date` rules preceded by `da`/`dal`. For `date` rules, prepositions (`entro`, `per`, `il`…) are handled automatically.
- The longest match wins; on a tie, the rule listed first.
- If the expression has the right shape but an impossible value, return `{ status: 'invalid', message }`: the text stays in the title and is highlighted in the preview.
- Useful words (months, weekdays, numbers in letters, prepositions) are in `lexicon.ts`; date helpers (`addDays`, `nextWeekday`, `mondayOfNextWeek`…) in `src/core/time.ts`.

The parser is pure: it runs in the renderer (instant preview) and in the main process, which re-parses the text on save.

### Tests

`npm test` runs about 380 tests:

- `parser.dates.test.ts`, `parser.syntax.test.ts`: Italian dates, weekdays, end of month and year, leap years, time zone, syntax, ambiguous and invalid input
- `grouping.test.ts`, `summary.test.ts`: grouping, sorting, summary and the suggestion rule
- `data.test.ts`: migrations, repositories, full-text search, delete with undo, JSON backup
- `service.test.ts`: quick entry and the views used by the UI
- `reminders.test.ts`: alerts at the due time, early reminders, notification text
- `time.test.ts`: date arithmetic, daylight saving time, formatting
- `recurrence.test.ts`, `parser.planning.test.ts`: recurrence, start date, estimate, waiting
- `planning.test.ts`: recurrence on completion, My Day, Scheduled, Waiting, people, backup v2 and migrations
- `text.test.ts`, `autoBackup.test.ts`: copyable text, automatic backup

Tests run with `ELECTRON_RUN_AS_NODE`, i.e. Electron's bundled Node, so the native SQLite module is exactly the one the app uses.

## License

[MIT](LICENSE)
