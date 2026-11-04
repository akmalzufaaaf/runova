# Runova — Hackathon Submission Copy

## 1. Project Description

**Runova** is an AI running-route generator that designs the run for you. Existing
apps force runners to plan their own routes: Strava shows routes other people made,
and Google Maps optimizes getting from point A to point B. Nobody answers the
question a runner actually has when standing in an unfamiliar place: *"I want a
5K run that feels relaxing and green — where do I go, and how do I get back?"*

Runova flips the process. The runner only says how they feel. The app greets them —
*"Hi, how's your day today?"* — they pick a mood (Stressed, Tired, Fresh, Energetic)
and how much time they have, tap **Let's Run**, and the AI decides everything else:
the distance, the vibe (nature, scenic, urban, historic), and the route itself.

Every route Runova generates is a **closed loop that starts and finishes at the
runner's current GPS location**, built on real OpenStreetMap pedestrian paths. The
runner can never get lost — the loop always brings them home. The AI generates
three loop options, ranks them by vibe-match and safety scores computed from real
map data (parks, rivers, cafés, landmarks along each route), marks its top
recommendation with an **AI Pick** badge, and explains its reasoning in plain
language. Runners can then refine the result conversationally — *"kurang hijau,
tambahkan sungai, hindari yang ramai"* (Indonesian for "less green, add a river,
avoid crowds") — and the AI re-ranks or regenerates the routes. During the run,
Runova tracks their position along the loop and acts as an audio tour guide,
speaking a short narration when they pass a named highlight such as Embung
Tambakboyo lake. Finishing the loop triggers a congratulations summary, and the
run is saved to their home dashboard and profile with a mini route map, weekly
goal progress, and personal stats.

Runova is built for travelers running in cities they've never visited, people who
moved somewhere new, and regular runners bored of the same loop. It is a
mobile-style web app with a zero-cost open map stack (MapLibre + OpenFreeMap /
OpenStreetMap, Valhalla routing, Overpass API), a Node backend with PostgreSQL
persistence, and Meta's Muse Spark model as its decision-making brain.

## 2. Describe your use of Meta products to build the submitted project

Runova's intelligence layer is powered by **Meta's Muse Spark 1.1 model**, accessed
through Meta's OpenAI-compatible API (`api.meta.ai/v1`) from our Node backend.
The model is used in four places:

1. **AI Decide (core decision-making).** The runner's mood and available time are
   sent to Muse Spark, which returns structured JSON deciding the run's distance,
   vibe category, and a human-readable reason (e.g. *"Kamu sedang stres — AI
   memilih rute nature yang teduh dan santai…"*). This output directly drives the
   route-generation engine.
2. **Route naming and explanation.** After our routing engine produces three
   real loops and computes their scores, Muse Spark receives *only those facts*
   (distance, vibe/safety scores, named highlights on the route) and generates a
   catchy name and a one-sentence explanation for each option. The model is
   explicitly instructed never to invent streets or places.
3. **Conversational refinement.** Free-text feedback in Indonesian or English is
   parsed by the model into a structured action — re-rank the existing loops with
   new scoring priorities, or regenerate with a new distance/vibe.
4. **Audio tour guide.** For each named highlight on the chosen loop, Muse Spark
   writes a short spoken narration that the app reads aloud via text-to-speech as
   the runner passes it.

The rest of the system deliberately uses deterministic open technology —
Valhalla for routing on OpenStreetMap data, the Overpass API for points of
interest, and MapLibre with a custom-styled OpenFreeMap basemap — so the model
handles judgment while algorithms guarantee factual truth. User accounts, run
history, and route geometry are persisted in PostgreSQL. The backend exposes
the model through `/api/ai/decide`, `/api/ai/parse`, `/api/ai/refine`,
`/api/ai/explain`, and `/api/ai/guide`, with local heuristic fallbacks so the
experience degrades gracefully.

## 3. Why are Meta's models important to your solution?

Runova's entire premise is that **the AI decides the track** — and that requires a
model that can do three things at once: understand how a person *feels*, reason
about what kind of run that implies, and explain the decision like a coach rather
than a search engine.

Muse Spark is central because our core interaction is emotional and ambiguous.
"I'm stressed and I have 40 minutes" is not a filter query; the model must infer
that this person needs a shorter, shaded, calming nature loop rather than a
long urban one, choose concrete parameters (5.5 km, nature vibe), and justify it
empathetically in the runner's own language — Runova's users speak Indonesian
and English interchangeably, often in the same sentence, and Muse Spark handles
that code-switching naturally in both our refinement chat and its spoken audio
guide narrations.

The model's structured-JSON reliability matters just as much: its decisions feed
directly into a routing engine, so outputs must be machine-parseable parameters,
not prose. And its speed makes the conversational loop — decide, refine,
re-decide — feel instant enough to use while standing on a street corner in
running shoes.

Without Meta's model, Runova would be another route planner with manual distance
sliders and vibe dropdowns — exactly the friction we set out to eliminate. With
it, the product becomes what we promised: you say how your day is going, and
the AI handles everything else, then proves it made a good decision by naming,
explaining, and narrating the route it built for you.
