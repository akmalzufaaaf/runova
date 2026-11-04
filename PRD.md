# Runova — Product Requirements Document (v0.2)

**Tagline:** Tell us the distance and the vibe. AI designs the loop.
**Platform:** Web app (mobile-responsive) · **Route type:** Loops only · **Maps:** OpenStreetMap (free stack)
**Demo location:** Depok, Sleman, Yogyakarta, Indonesia

## 1. Problem
- Runners in unfamiliar places want to run but fear unsafe areas and getting lost.
- Runners at home are bored of the same route but don't want to plan a new one manually.
- Existing tools optimize A→B navigation or show other people's routes; none design a
  running *experience* around distance + vibe + safety from where you stand.

## 2. Core principle (non-negotiable)
**Every route is a closed loop starting and finishing at the user's current GPS location.**
The runner can never get lost — the route always brings them home.

## 3. Target users
- Primary: travelers / people in a new city who want a safe, scenic run with zero planning.
- Secondary: regular runners who want fresh routes near home without manual planning.

## 4. User flow
1. Open app → GPS start detected (draggable pin fallback).
2. Choose distance (3K/5K/7K/10K/custom), vibe, pace.
3. AI generates **3 loop options**: map preview, distance, est. time, Vibe Match Score,
   Safety Score, highlights (named parks/rivers/landmarks on the route).
4. Select a loop → turn-by-turn preview → Start run.
5. Live guidance; loop ends back at start → summary + vibe rating.

## 5. Vibes (v1)
Nature & Relaxing · Scenic/Waterfront · Urban Energy · Historic/Sightseeing · Surprise me.
Scoring uses OSM data proximity: parks/forest/water (nature, scenic), cafés/shops (urban,
safety/populated heuristic), tourism/landmarks (historic).

## 6. Functional requirements
- FR1: Route generation MUST return loops (start == finish) within ±10% of target distance.
- FR2: Routes MUST follow real pedestrian paths from the OSM graph (Valhalla); no invented roads.
- FR3: System MUST return 3 distinct loops ranked by selected vibe.
- FR4: Each route MUST show distance, est. time at user pace, vibe + safety scores, highlights.
- FR5: Map MUST be custom-styled (Runova theme) on free OSM vector tiles (MapLibre + OpenFreeMap).
- FR6 (next): Natural-language input ("peaceful 5K sunrise run, not hilly") parsed by Meta AI.
- FR7 (next): Real GPS tracking, off-route detection + auto-reroute, live-location sharing.

## 7. Non-functional
- Map/routing stack cost: $0 (open/free tiers only). No API keys required for the spike.
- Generation target: 3 loops in < 30s on public fair-use servers; cache + self-host later.
- Safety scores are heuristics and must be labeled as such in UI copy.

## 8. Architecture
`Web app (MapLibre GL) → Valhalla (loop routing) + Overpass (vibe features) → scoring/ranking → Meta AI (vibe parsing, naming, explanation — next iteration)`

Loop algorithm: waypoint ring around GPS start, radius calibrated iteratively to hit target
distance; 3 rotations for variety. Verified in Depok: 5K target → 5.02–5.15 km loops.

## 9. Out of scope (v1)
Social feed, training plans, leaderboards, native apps, point-to-point routes.

## 10. Metrics
Generation→run-start conversion · loop completion rate · vibe rating ≥4/5 · repeat generations/week.

## 11. Risks
OSM data quality varies by area (verify per demo location) · public routing servers are
fair-use only · AI must never invent streets — LLM explains/ranks, routing engine validates.
