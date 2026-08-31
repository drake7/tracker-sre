# Staff Track — Prep Tracker

A React app for tracking Java, System Design, Generative AI, Spring Boot Advanced, Deep Database, and Top 20 Companies interview prep. Built as a companion to a career advancement plan targeting a Staff Backend Engineer role.

**Live site:** _add your GitHub Pages URL here once deployed_

## Structure

Real multi-page routing, one page per content section:

- `/` — Dashboard (overall progress, streak, monthly chart)
- `/track/:key` — a track's section overview (e.g. `/track/java`)
- `/track/:key/:sectionSlug` — a single section's items (e.g. `/track/java/java-21-2023-lts-the-big-one`)
- `/roadmap` — the 3/6/12-month career roadmap

Routing uses `HashRouter` (URLs look like `#/track/java/...`) specifically so this works on GitHub Pages with **zero server configuration** — no 404.html redirect trick needed. If you'd rather have clean paths without the `#`, switch to `BrowserRouter` in `src/App.jsx` and add the [spa-github-pages 404.html workaround](https://github.com/rafgraph/spa-github-pages).

## Content

Each track's content lives in its own file under `src/data/`:

```
src/data/java.js          — 54 items, 10 sections, all with Deep Dives (code + diagrams)
src/data/springBoot.js    — 22 items, 10 with Deep Dives
src/data/systemDesign.js  — 28 items
src/data/genai.js         — 20 items
src/data/databases.js     — 20 items
src/data/companyPrep.js   — 39 items
src/data/roadmap.js       — the 3/6/12-month plan
```

An item looks like:

```js
{
  id: "j21-1",                 // must be globally unique — progress is keyed on this
  t: "Virtual Threads — Standardized",
  d: "Hard",                   // Easy | Medium | Hard
  desc: "One-line summary shown in the collapsed row.",
  notes: {                     // optional — adds a "📘 Deep Dive" section
    explain: ["paragraph 1", "paragraph 2"],
    code: [{ lang: "java", caption: "...", src: `...` }],
    diagram: { type: "flow" | "compare" | "tree", ... },
    tricks: ["interview gotcha 1", "..."]
  }
}
```

Add a new item by adding an object to the right section's `items` array — a new page/route is created automatically, no routing code to touch.

## Development

```
npm install
npm run dev       # local dev server with hot reload
npm run build     # production build → dist/
npm run preview   # preview the production build locally
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the app and publishes `dist/` to GitHub Pages automatically. One-time setup after your first push:

1. Go to the repo's **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Push to `main` (or re-run the workflow from the **Actions** tab) — the site will be live at `https://<username>.github.io/<repo-name>/` a minute or two later.

No repo-name configuration needed in the code — `vite.config.js` uses `base: './'`, so the build works at any subpath.

## Persistence

Progress is saved to browser local storage automatically, plus (in Chrome/Edge) an optional real save file on disk via the File System Access API — see the in-app sidebar. Since this will likely be opened from multiple devices (desktop + phone), remember that local storage is **per device/browser** — it does not sync between them. Use the **Export/Import progress (JSON)** buttons on the Dashboard to move progress between devices until/unless a synced backend is added.
