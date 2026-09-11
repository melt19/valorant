# Lineup Board

A static site that links out to YouTube Shorts of ability lineups. Pick an agent from the tabs, pick a map from the grid, browse that map's clips. No backend, no build step — pure HTML/CSS/JS, deployed via GitLab Pages.

The UI re-themes itself per agent — Vyse (the only agent seeded so far) uses her rose/purple palette; anything not yet themed falls back to a neutral forest-green look.

## Run it locally

Browsers block `fetch()` on local files opened directly (`file://`), so serve the `public/` folder instead:

```bash
cd public
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

(Any static server works — `npx serve public` is another option if you have Node.)

## Add your own lineups

Edit `public/data/lineups.json`. Each entry looks like:

```json
{
  "id": "ascent-viper-mid-smoke",
  "map": "Ascent",
  "agent": "Viper",
  "ability": "Toxic Screen",
  "title": "Mid smoke from A main",
  "note": "Lineup from spawn, splits mid in one throw.",
  "youtubeId": "dQw4w9WgXcQ"
}
```

- `id` — must be unique; used internally, not shown.
- `youtubeId` — the video ID from the Shorts URL. For `https://www.youtube.com/shorts/dQw4w9WgXcQ`, the ID is `dQw4w9WgXcQ`.
- The six seed entries use placeholder IDs (`REPLACE_ME_1` etc.) — swap those for real video IDs before you deploy, or the embeds will 404.

No rebuild step needed — just save the file and refresh.

## Add a new agent

Adding a lineup with a new `agent` value (e.g. `"Viper"`) automatically creates its tab and map grid — no other data changes needed. To give that agent its own colors instead of the default forest-green fallback, add an entry to `agentThemes` at the top of `public/app.js`:

```js
Viper: {
  bg: "#0E1512",
  bgRaised: "#16201B",
  bgCard: "#1B2822",
  line: "#2A3B31",
  accent: "#5FD97A",
  accent2: "#2E8B6F",
  accentWash: "rgba(95, 217, 122, 0.12)",
},
```

## Deploy to GitLab Pages

1. Push this repo to GitLab, with `public/` and `.gitlab-ci.yml` at the repo root.
2. GitLab CI runs automatically on push to your default branch and publishes `public/` as the Pages site.
3. Find the URL under **Settings → Pages** once the pipeline finishes (usually `https://<username>.gitlab.io/<repo-name>/`).

No GitLab Runner setup needed — Pages uses GitLab's shared runners by default.

## What to extend first

1. **Thumbnails on cards** — both the map cards and clip cards are text-only right now; pulling each video's thumbnail (`https://img.youtube.com/vi/<id>/hqdefault.jpg`) in would make everything much easier to scan.
2. **Deep links** — add `?agent=&map=&id=` handling in `app.js` so you can link directly to one agent, map, or clip instead of always landing on the map grid.
3. **Tags beyond map/agent** — e.g. "post-plant", "retake", "one-way" as a filter within a map's clip list, once you have enough clips that map+agent isn't enough to narrow down.
4. **Move data to a spreadsheet** — if you'll have many contributors adding lineups, a Google Sheet + a small export script to regenerate `lineups.json` is easier to maintain than hand-editing JSON.