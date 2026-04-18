# EverythingTracker

A small, opinionated daily tracker built around one question: **how much of your day actually went where you wanted it to go?**

It's a single page app. No account, no server, no sync. Your data lives in your browser.

---

## Why it exists

Most productivity apps are either todo lists (binary: done / not done) or time trackers (endless stopwatches). Neither answers the thing I actually cared about, which is *"did I spend my day the way I meant to?"*

EverythingTracker sits in between. You pick a handful of things worth doing today, give each one a time budget in minutes, and the app:

- runs a timer for whatever you're doing right now,
- counts your streak of days you finished everything,
- shows you what you actually spent your time on, month over month.

It's intentionally small.

---

## Features

- **Daily task list** with minute budgets, drag-to-reorder, and one-click timers.
- **Focus timer** — per-task, stays running even if you tab away. Minimizes into the nav bar so you can peek at it without losing what you were doing.
- **Meditation mode** with a pleasant brown-noise generator and a chime every five minutes. (Set a task's timer type to meditation if you want it.)
- **Streak tracking** with a grace period: miss a day, you've got tomorrow to make it up before the streak breaks.
- **Configurable rest days** that don't count toward — or break — your streak.
- **Stats page** with daily productive minutes and per-task totals over month / quarter / year windows.
- **Mind map** for the longer-running "what am I doing with my life" questions. Zoomable, pannable, with colors and images.
- **Light & dark themes.**
- **Local-first** — nothing ever leaves your machine. Export / import JSON backups from the Settings page.

---

## Screenshots

*Coming soon — drop screenshots in `src/assets/` and link them here.*

---

## Running it

Requires Node 20+.

```bash
npm install
npm run dev
```

Open http://localhost:5173.

To build for production:

```bash
npm run build
npm run preview
```

The `dist/` folder is a plain static bundle — drop it on Netlify, Vercel, GitHub Pages, S3, a USB stick, whatever.

---

## How to use it

**Pick a handful of things worth doing today.** Edit the defaults by double-clicking any task. Give each one an honest minute budget — not how long you wish it took, how long it actually takes.

**Click a task** to open its timer and start working. **Double-click** to edit its name or minutes. **Drag** the `⠿` handle to reorder. The checkbox on the left marks it done manually if you don't want to use the timer.

**When the timer finishes**, the task auto-completes. When *every* task for the day is done, the app makes a bit of a fuss about it. That's on purpose.

**Navigate days** with the arrows on the left and right edges. By default you can edit yesterday, today, and tomorrow — adjust that range in Settings.

---

## Settings

Everything worth configuring lives under the ⚙ icon in the top-right:

- **Theme** — dark or light.
- **Editable day range** — how many days back and forward you can check tasks off on. Default: 1 / 1.
- **Rest days** — pick any days of the week that shouldn't count. Default: none.
- **Show hint text** — toggle the little "double-click to edit" reminders.
- **Your data** — export a JSON backup, or import one to restore / move between devices.

---

## Tech

- **React 19** + TypeScript
- **Vite** for the build
- **Recharts** for the stats charts
- **localStorage** for persistence
- **Web Audio API** for all sound effects (no audio files shipped)

No backend, no database, no analytics, no tracking. One HTML file, one JS bundle, one CSS file.

---

## Privacy

Your tasks, your history, your mind map — all of it lives in your browser's localStorage. This app makes zero network requests at runtime. If you clear your site data, it's gone; use the export feature if you want a backup.

---

## License

MIT. Use it, fork it, strip it for parts.
