# Runova — AI Running Routes for the Vibe You Want

> Tell us the distance and the vibe. AI designs the loop.

Runova generates **loop running routes that start and finish at your current GPS location**,
matched to your desired distance and vibe (nature, scenic, urban, historic) — so you can run
confidently anywhere, even in a city you've never visited. Every route is a validated loop on
real OpenStreetMap paths: it always brings you back to where you started.

## Run it

```bash
node backend/server.js
# open http://localhost:5173
```

User flow: **Login → map of your location (Layer 1) with a draggable bottom sheet
(Layer 2) → distance + vibe → Generate Routes → 3 loop options → select → Start Run
(live tracking) → Congratulations.**

No build step, no API keys, $0 map stack. (GPS needs localhost/HTTPS — use the
"Demo: Depok, Yogyakarta" start or drag the blue pin if GPS is blocked.)

## How it works

1. **Start = your GPS location.** Loops are generated around it; start === finish, always.
2. **Loop engine:** a ring of waypoints is placed around your start, then routed on real
   pedestrian paths via **Valhalla** (OpenStreetMap). The ring radius auto-calibrates
   (up to 3 tries) until the road distance matches your target within ~8%.
   Three rotations → three different loops.
3. **Vibe scoring:** one **Overpass API** fetch gets parks, water, forest, cafés, shops and
   landmarks near you. Each loop is scored by how much of it runs near those features
   (Nature / Scenic / Urban / Historic / Safety heuristic), named after its best highlight
   (e.g. "Tambakbayan River Loop"), and ranked by your chosen vibe.
4. **Custom pretty map for free:** MapLibre GL JS renders **OpenFreeMap** vector tiles
   (OpenStreetMap data, no key, no load limits). Runova recolors the style at runtime
   (`applyRunovaTheme` in `app.js`): vivid parks/water, muted buildings, highlighted footpaths.

## Stack (all free / open)

| Need | Tool |
|---|---|
| Map rendering | MapLibre GL JS (open-source) |
| Map tiles + style | OpenFreeMap (OSM vector tiles, custom-styled) |
| Loop routing + turn-by-turn | Valhalla public server (FOSSGIS) |
| Vibe / POI data | Overpass API |
| AI layer (next) | Meta model API — natural-language vibe parsing, route naming & explanation |

Note: Mapbox would also work (free tier ≈ 50k map loads + 100k Directions/month, payment
method required for full tier), but the open stack keeps Runova at $0 with no billing risk.

## Where the AI lives

- **Backend AI layer** (`backend/server.js`, `/api/ai/parse` + `/api/ai/explain`):
  Meta AI (**Muse Spark 1.1**, OpenAI-compatible `api.meta.ai/v1`) does two jobs —
  (1) parse natural language ("lari santai 7 km dekat sungai, yang aman") into
  distance + vibe + preferences, and (2) name & explain each route using *only*
  facts from the routing engine (distance, scores, highlights) — it never invents roads.
- **Enable it:** set the key, then start the backend:
  `MODEL_API_KEY=... node backend/server.js` (PowerShell: `$env:MODEL_API_KEY="..."`).
  Without a key it transparently falls back to local keyword heuristics and the UI
  tells you which mode is active.
- **Not AI (by design):** routing (Valhalla), distance calibration, and vibe/safety
  scoring are deterministic algorithms — an LLM must never hallucinate streets.

## Project structure

```
meta/
├── frontend/          # web app (no build)
│   ├── index.html     # login + map layer + bottom-sheet layer + HUD + congrats modal
│   ├── styles.css     # dark-navy / blue theme (reference-style)
│   └── app.js         # login, sheet drag, loop engine client, scoring, tracking
├── backend/
│   └── server.js      # zero-dep Node: serves frontend, /api/health,
│                      # /api/route → Valhalla proxy, /api/vibe → Overpass proxy
├── PRD.md
└── README.md
```

## Known limitations

- Public Valhalla/Overpass servers are fair-use (no uptime guarantee); add caching/self-hosting later.
- Safety score is a populated-area heuristic, not crime/lighting data — always verify locally.
- "Start run" is a simulation for demo; real GPS tracking + off-route rerouting is next.
