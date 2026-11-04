/* Runova — GPS-start, loop-only AI route generator
   Flow: login → map (Layer 1) + draggable bottom sheet (Layer 2) → inputs →
   generate (keeps running while sheet is down) → 3 loop options → select →
   start run with tracking → congratulations.
   Routes ALWAYS form a closed loop: start === finish === user's current location. */

const DEPOK = { lat: -7.7610, lon: 110.4090 }; // Babarsari, Depok, Sleman, Yogyakarta (demo fallback)

const state = {
  user: null,
  token: localStorage.getItem('runova_token') || null,
  start: { ...DEPOK },
  distanceKm: 5,
  vibe: 'nature',
  routes: [],
  selectedId: null,
  showAllRoutes: false,
  generating: false,
  mood: 'fresh',
  minutes: 40,
  aiReason: null,
  voiceOn: true,
  sheet: 'collapsed', // collapsed | half | full | hidden
  run: null,
};

const VIBE_LABELS = {
  nature: 'Nature & Relaxing', scenic: 'Scenic / Waterfront', urban: 'Urban Energy',
  historic: 'Historic / Sightseeing', surprise: 'Surprise me',
};
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
/* Frontend hosted separately (GitHub Pages) talks to the Railway backend.
   Localhost development still uses the local backend. Override anytime with:
   localStorage.setItem('runova_api_base', 'https://your-backend') */
const API_BASE = localStorage.getItem('runova_api_base')
  || (['localhost', '127.0.0.1'].includes(location.hostname) ? '' : 'https://runova-production.up.railway.app');

/* ================= LOGIN ================= */
function initLogin() {
  const saved = localStorage.getItem('runova_user');
  if (saved) { state.user = saved; enterApp(); }
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('loginName').value.trim();
    if (!name) return;
    // Real account when a backend+DB is reachable; seamless local login otherwise.
    const password = $('loginPass').value;
    let auth = await postJson('/api/auth/login', { identifier: name, password });
    if (!auth) auth = await postJson('/api/auth/register', { name, password });
    if (auth && auth.token) {
      state.token = auth.token;
      localStorage.setItem('runova_token', auth.token);
    }
    state.user = name;
    localStorage.setItem('runova_user', name);
    enterApp();
    autoLocate(); // starting point is always the user's current location
  });
  $('btnLogout').addEventListener('click', () => {
    localStorage.removeItem('runova_user');
    localStorage.removeItem('runova_token');
    state.token = null;
    stopRun(false);
    $('loginScreen').classList.remove('hidden');
  });
}
function enterApp() {
  $('loginScreen').classList.add('hidden');
  const first = (state.user || 'R').trim().charAt(0).toUpperCase();
  $('homeName').textContent = `Hello, ${state.user}`;
  $('homeAvatar').textContent = first;
  $('profileName').textContent = state.user;
  $('profileAvatar').textContent = first;
  $('decideGreeting').textContent = `Hi ${state.user}, how's your day today?`;
  renderHome();
  showView('home');
}

/* ================= VIEWS + BOTTOM NAV ================= */
function showView(name) {
  for (const v of ['home', 'map', 'profile']) {
    $(`view${v.charAt(0).toUpperCase() + v.slice(1)}`).classList.toggle('hidden', v !== name);
  }
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.nav === name));
  if (name === 'map') setTimeout(() => { map.resize(); }, 60);
  if (name === 'home') renderHome();
  if (name === 'profile') renderProfile();
}
document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => showView(b.dataset.nav)));
$('btnPlanRun').addEventListener('click', () => showView('map'));
$('btnBackHome').addEventListener('click', () => showView('home'));
$('btnSettingsHome').addEventListener('click', () => showView('profile'));

/* ================= HISTORY (localStorage) ================= */
function loadHistory() {
  try { return JSON.parse(localStorage.getItem('runova_history') || '[]'); } catch (e) { return []; }
}
function saveHistory(entry) {
  const h = loadHistory();
  h.unshift(entry);
  localStorage.setItem('runova_history', JSON.stringify(h.slice(0, 30)));
  if (state.token) { // sync to PostgreSQL when logged in via backend (fire-and-forget)
    postJson('/api/runs', { name: entry.name, km: entry.km, kcal: entry.kcal, vibe: entry.vibe, vibeMatch: entry.vibeMatch, safety: entry.safety, coords: entry.coords });
  }
}
function routeThumb(coords) {
  if (!coords || coords.length < 2) return '';
  const step = Math.max(1, Math.floor(coords.length / 60));
  const pts = coords.filter((_, i) => i % step === 0);
  const lons = pts.map(p => p[0]), lats = pts.map(p => p[1]);
  const minX = Math.min(...lons), maxX = Math.max(...lons), minY = Math.min(...lats), maxY = Math.max(...lats);
  const sx = (maxX - minX) || 1e-9, sy = (maxY - minY) || 1e-9;
  const points = pts.map(p => `${(6 + (p[0] - minX) / sx * 52).toFixed(1)},${(42 - (p[1] - minY) / sy * 36).toFixed(1)}`).join(' ');
  return `<svg width="64" height="48" viewBox="0 0 64 48"><polyline points="${points}" fill="none" stroke="#625fe0" stroke-width="2.5" stroke-linejoin="round"/><circle cx="${points.split(' ')[0].split(',')[0]}" cy="${points.split(' ')[0].split(',')[1]}" r="3.5" fill="#625fe0"/></svg>`;
}
function renderHome() {
  const h = loadHistory();
  const totalKm = h.reduce((s, r) => s + r.km, 0);
  const goal = 50;
  $('goalDone').textContent = `${totalKm.toFixed(1)} km done`;
  $('goalLeft').textContent = `${Math.max(0, goal - totalKm).toFixed(1)} km left`;
  $('goalBar').style.width = `${Math.min(100, totalKm / goal * 100)}%`;
  $('pillDistance').textContent = `${state.distanceKm}K route`;
  const list = $('recentList');
  if (!h.length) { list.innerHTML = '<div class="empty-light">No runs yet. Plan your first AI loop!</div>'; return; }
  list.innerHTML = '';
  h.slice(0, 6).forEach(r => {
    const d = new Date(r.date);
    const item = document.createElement('div');
    item.className = 'recent-item';
    item.innerHTML = `${routeThumb(r.coords)}<div class="recent-info"><small>${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} · ${r.name}</small><strong>${r.km.toFixed(2)} km</strong><span>🔥 ${r.kcal} kcal · ${VIBE_LABELS[r.vibe] || ''}</span></div><span style="color:#a6abc2">›</span>`;
    item.onclick = () => showView('map');
    list.appendChild(item);
  });
}
function renderProfile() {
  const h = loadHistory();
  $('totalKm').textContent = `${h.reduce((s, r) => s + r.km, 0).toFixed(1)} km`;
  $('totalRuns').textContent = `${h.length} runs`;
  $('totalKcal').textContent = `${h.reduce((s, r) => s + r.kcal, 0)} kcal`;
}
initLogin();

/* ================= MAP (Layer 1) ================= */
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/positron',
  center: [state.start.lon, state.start.lat],
  zoom: 14,
});
map.addControl(new maplibregl.NavigationControl(), 'top-right');
map.on('load', applyRunovaTheme);

function applyRunovaTheme() {
  for (const layer of map.getStyle().layers || []) {
    const id = (layer.id || '').toLowerCase();
    const src = (layer['source-layer'] || '').toLowerCase();
    try {
      if (layer.type === 'fill' && (src === 'water' || id.includes('water'))) {
        map.setPaintProperty(layer.id, 'fill-color', '#bfe3f7');
      } else if (layer.type === 'fill' && /park|wood|forest|grass|pitch|landcover|nature/.test(id + src)) {
        map.setPaintProperty(layer.id, 'fill-color', '#dcebd2');
        map.setPaintProperty(layer.id, 'fill-opacity', 0.7);
      } else if (layer.type === 'fill' && (src === 'building' || id.includes('building'))) {
        map.setPaintProperty(layer.id, 'fill-color', '#e2e6ec');
        map.setPaintProperty(layer.id, 'fill-opacity', 0.7);
      } else if (layer.type === 'line' && /path|footway|pedestrian|track|cycleway/.test(id)) {
        map.setPaintProperty(layer.id, 'line-color', '#c3cedd');
      }
    } catch (e) { /* unsupported paint property — skip */ }
  }
}

const pinEl = document.createElement('div');
pinEl.className = 'start-pin';
const startMarker = new maplibregl.Marker({ element: pinEl, draggable: true })
  .setLngLat([state.start.lon, state.start.lat])
  .addTo(map);
startMarker.on('dragend', () => {
  const ll = startMarker.getLngLat();
  setStart(ll.lat, ll.lng, 'Start: your location (pin adjusted)');
});

function setStart(lat, lon, label) {
  state.start = { lat, lon }; // start point is silently the user's current location
  startMarker.setLngLat([lon, lat]);
}
function autoLocate() {
  if (!navigator.geolocation) { setStart(DEPOK.lat, DEPOK.lon, 'Start: Depok demo (GPS unsupported)'); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => { setStart(pos.coords.latitude, pos.coords.longitude, 'Start: your GPS location'); map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 15 }); },
    () => setStart(DEPOK.lat, DEPOK.lon, 'Start: Depok, Yogyakarta (demo — GPS denied)'),
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

/* ================= BOTTOM SHEET (Layer 2) ================= */
const sheet = $('sheet');
function setSheet(mode) {
  state.sheet = mode;
  sheet.classList.remove('snap-collapsed', 'snap-half', 'snap-full', 'sheet-hidden');
  sheet.classList.add(mode === 'hidden' ? 'sheet-hidden' : `snap-${mode}`);
  sheet.style.transform = '';
  updateSelectedBar();
}
(function initSheetDrag() {
  const handle = $('sheetHandle');
  let startY = 0, startOffset = 0, dragging = false, moved = false;
  const offsets = () => {
    const h = sheet.offsetHeight;
    return { full: 0, half: h * 0.46, collapsed: h - 108 };
  };
  handle.addEventListener('pointerdown', (e) => {
    dragging = true; moved = false;
    startY = e.clientY;
    startOffset = offsets()[state.sheet === 'hidden' ? 'collapsed' : state.sheet] || 0;
    sheet.classList.add('dragging');
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    if (Math.abs(dy) > 4) moved = true;
    const h = sheet.offsetHeight;
    const next = Math.min(h - 60, Math.max(0, startOffset + dy));
    sheet.style.transform = `translateY(${next}px)`;
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    sheet.classList.remove('dragging');
    const offs = offsets();
    if (!moved) { // simple tap on handle toggles
      setSheet(state.sheet === 'full' ? 'collapsed' : 'full');
      return;
    }
    const m = /translateY\(([-\d.]+)px\)/.exec(sheet.style.transform || '');
    const cur = m ? parseFloat(m[1]) : offs.collapsed;
    const nearest = Object.entries(offs).sort((a, b) => Math.abs(a[1] - cur) - Math.abs(b[1] - cur))[0][0];
    setSheet(nearest);
  };
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
})();

/* ================= HELPERS ================= */
function setStatus(msg) { $('status').textContent = msg; }
function destPoint(lat, lon, bearingDeg, distM) {
  const R = 6371000, d = distM / R, b = bearingDeg * Math.PI / 180;
  const la1 = lat * Math.PI / 180, lo1 = lon * Math.PI / 180;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(b));
  const lo2 = lo1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
  return { lat: la2 * 180 / Math.PI, lon: lo2 * 180 / Math.PI };
}
function distM(a, b) {
  const dx = (a.lon - b.lon) * Math.cos(a.lat * Math.PI / 180) * 111320;
  const dy = (a.lat - b.lat) * 110540;
  return Math.hypot(dx, dy);
}
function decodePolyline6(str) {
  const coords = []; let index = 0, lat = 0, lon = 0;
  while (index < str.length) {
    for (const which of [0, 1]) {
      let shift = 0, result = 0, byte;
      do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
      const delta = (result & 1) ? ~(result >> 1) : (result >> 1);
      if (which === 0) lat += delta; else lon += delta;
    }
    coords.push([lon / 1e6, lat / 1e6]);
  }
  return coords;
}
function fmtClock(totalSec) {
  const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = Math.floor(totalSec % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ================= LOOP ENGINE (via backend proxy) ================= */
/* Backend-first API helper: returns null when no backend is reachable
   (e.g. static GitHub Pages hosting) so callers can use local fallbacks. */
async function postJson(url, payload) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const r = await fetch(url.startsWith('/') ? API_BASE + url : url, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}

async function valhallaRoute(points) {
  const payload = {
    locations: points.map(p => ({ lat: p.lat, lon: p.lon })),
    costing: 'pedestrian', shape_format: 'geojson',
    directions_options: { units: 'kilometers', language: 'en-US' },
  };
  const viaBackend = await postJson('/api/route', payload);
  if (viaBackend) return viaBackend;
  const res = await fetch('https://valhalla1.openstreetmap.de/route', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Routing ${res.status}`);
  return res.json();
}
function extractRoute(trip) {
  let coords = []; const maneuvers = [];
  for (const leg of trip.legs) {
    const legCoords = typeof leg.shape === 'string' ? decodePolyline6(leg.shape) : (leg.shape && leg.shape.coordinates) || [];
    if (coords.length && legCoords.length) legCoords.shift();
    coords = coords.concat(legCoords);
    for (const m of leg.maneuvers) maneuvers.push({ instruction: m.instruction, km: m.length });
  }
  return { coords, maneuvers, distanceKm: trip.summary.length };
}
/* Closed loop: waypoint ring around the GPS start; last point is the start again.
   Radius calibrates (max 3 tries) until road distance hits the target within 8%. */
async function generateLoop(targetKm, rotationDeg, onStep) {
  let k = 0.52, best = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const radiusM = (targetKm * 1000 / (2 * Math.PI)) * k;
    const ring = [0, 90, 180, 270].map(a => destPoint(state.start.lat, state.start.lon, rotationDeg + a, radiusM));
    const route = extractRoute((await valhallaRoute([state.start, ...ring, state.start])).trip);
    const err = Math.abs(route.distanceKm - targetKm) / targetKm;
    if (!best || err < best.err) best = { ...route, err };
    if (err <= 0.08) break;
    if (onStep) onStep();
    k = Math.min(0.9, Math.max(0.3, k * targetKm / route.distanceKm));
    await sleep(300);
  }
  return best;
}

/* ================= VIBE SCORING ================= */
async function fetchVibeFeatures(targetKm) {
  const radius = Math.round(Math.min(4200, Math.max(1400, targetKm * 350 + 800)));
  const { lat, lon } = state.start;
  const q = `[out:json][timeout:40];
(
  way[leisure=park](around:${radius},${lat},${lon});
  way[natural=water](around:${radius},${lat},${lon});
  way[waterway](around:${radius},${lat},${lon});
  way[landuse=forest](around:${radius},${lat},${lon});
  way[landuse=grass](around:${radius},${lat},${lon});
  node[amenity](around:${radius},${lat},${lon});
  node[shop](around:${radius},${lat},${lon});
  node[tourism](around:${radius},${lat},${lon});
);
out tags geom;`;
  for (const url of [API_BASE + '/api/vibe', 'https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    try {
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q) });
      if (res.ok) return parseFeatures((await res.json()).elements || []);
    } catch (e) { /* try next endpoint */ }
  }
  return null;
}
function parseFeatures(elements) {
  const green = [], water = [], pois = [], namedAreas = [];
  for (const el of elements) {
    const t = el.tags || {};
    const geom = el.geometry ? el.geometry.map(g => ({ lat: g.lat, lon: g.lon })) : (el.lat ? [{ lat: el.lat, lon: el.lon }] : []);
    if (!geom.length) continue;
    if (t.leisure === 'park' || t.landuse === 'forest' || t.landuse === 'grass') {
      green.push(geom); if (t.name) namedAreas.push({ name: t.name, geom });
    } else if (t.natural === 'water' || t.waterway) {
      water.push(geom); if (t.name) namedAreas.push({ name: t.name, geom });
    } else {
      const p = { lat: el.lat, lon: el.lon, name: t.name || null, tourism: !!t.tourism };
      if (p.lat) { pois.push(p); if (p.name && p.tourism) namedAreas.push({ name: p.name, geom: [p] }); }
    }
  }
  return { green, water, pois, namedAreas };
}
function nearFraction(samples, geoms, thresholdM) {
  if (!geoms.length) return 0;
  let hit = 0;
  for (const s of samples) {
    let ok = false;
    outer: for (const g of geoms) { for (const v of g) { if (distM(s, v) <= thresholdM) { ok = true; break outer; } } }
    if (ok) hit++;
  }
  return hit / samples.length;
}
function scoreRoute(route, features) {
  const pts = route.coords.map(c => ({ lat: c[1], lon: c[0] }));
  const step = Math.max(1, Math.floor(pts.length / 140));
  const samples = pts.filter((_, i) => i % step === 0);
  if (!features) return { nature: 65, scenic: 60, urban: 60, historic: 55, safety: 70, highlights: [], highlightPoints: [] };
  const greenFrac = nearFraction(samples, features.green, 80);
  const waterFrac = nearFraction(samples, features.water, 80);
  const poiFrac = nearFraction(samples, features.pois.map(p => [[p]]), 120);
  const tourismFrac = nearFraction(samples, features.pois.filter(p => p.tourism).map(p => [[p]]), 150);
  const highlights = [];
  const highlightPoints = []; // named places + their coordinates — used by the audio guide
  for (const area of features.namedAreas) {
    if (highlights.length >= 4) break;
    if (highlights.includes(area.name)) continue;
    let bestV = null, bestD = Infinity;
    for (const v of area.geom) for (const s of samples) { const d = distM(s, v); if (d < bestD) { bestD = d; bestV = v; } }
    if (bestV && bestD <= 120) { highlights.push(area.name); highlightPoints.push({ name: area.name, lat: bestV.lat, lon: bestV.lon }); }
  }
  return {
    nature: Math.min(100, Math.round(greenFrac * 150 + waterFrac * 40)),
    scenic: Math.min(100, Math.round(waterFrac * 220 + greenFrac * 35)),
    urban: Math.min(100, Math.round(poiFrac * 170)),
    historic: Math.min(100, Math.round(tourismFrac * 260 + poiFrac * 35)),
    safety: Math.min(97, Math.round(52 + poiFrac * 75 + greenFrac * 10)),
    highlights, highlightPoints,
  };
}
function vibeScore(scores, vibe) {
  if (vibe === 'nature') return scores.nature;
  if (vibe === 'scenic') return scores.scenic;
  if (vibe === 'urban') return scores.urban;
  if (vibe === 'historic') return scores.historic;
  return Math.round((scores.nature + scores.scenic + scores.urban + scores.historic) / 4);
}
const COMPASS = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
function routeName(scores, rotation, index) {
  if (scores.highlights.length) return `${scores.highlights[0]} Loop`;
  const word = { nature: 'Green', scenic: 'River', urban: 'City', historic: 'Heritage', surprise: 'Discovery' }[state.vibe];
  return `${COMPASS[Math.round((rotation % 360) / 45) % 8]} ${word} Loop ${index + 1}`;
}

/* ================= ROUTES ON MAP + CARDS ================= */
function drawRoutes() {
  for (let i = 0; i < 3; i++) {
    const id = `route-${i}`;
    if (map.getLayer(`${id}-line`)) map.removeLayer(`${id}-line`);
    if (map.getLayer(`${id}-casing`)) map.removeLayer(`${id}-casing`);
    if (map.getSource(id)) map.removeSource(id);
  }
  state.routes.forEach((route, i) => {
    const id = `route-${i}`;
    const isSelected = route.id === state.selectedId;
    map.addSource(id, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: route.coords } } });
    map.addLayer({
      id: `${id}-casing`, type: 'line', source: id,
      layout: { visibility: isSelected ? 'visible' : 'none' },
      paint: { 'line-color': '#ffffff', 'line-width': 10, 'line-opacity': 0.9 },
    });
    map.addLayer({
      id: `${id}-line`, type: 'line', source: id,
      layout: { visibility: isSelected || state.showAllRoutes ? 'visible' : 'none' },
      paint: { 'line-color': isSelected ? '#625fe0' : '#a6abc2', 'line-width': isSelected ? 7 : 3, 'line-opacity': isSelected ? 1 : 0.5 },
    });
    map.on('click', `${id}-line`, () => selectRoute(route.id, false));
  });
  const sel = state.routes.find(r => r.id === state.selectedId);
  if (sel && !state.run) {
    const b = new maplibregl.LngLatBounds();
    sel.coords.forEach(c => b.extend(c));
    map.fitBounds(b, { padding: 70 });
  }
}
function renderCards() {
  const wrap = $('routeCards');
  wrap.innerHTML = '';
  if (!state.routes.length) { wrap.innerHTML = '<div class="empty">No routes yet.<br/>Generate routes to see 3 AI-designed loops here.</div>'; return; }
  const toggle = document.createElement('label');
  toggle.className = 'hint';
  toggle.innerHTML = `<input type="checkbox" ${state.showAllRoutes ? 'checked' : ''}/> Show other options on map (gray)`;
  toggle.querySelector('input').onchange = (e) => { state.showAllRoutes = e.target.checked; drawRoutes(); };
  wrap.appendChild(toggle);
  state.routes.forEach((route, idx) => {
    const card = document.createElement('div');
    card.className = 'route-card' + (route.id === state.selectedId ? ' selected' : '');
    card.innerHTML = `
      <h3><span style="color:${route.id === state.selectedId ? '#625fe0' : '#a6abc2'}">●</span> ${idx === 0 ? '<span class="ai-pick">⭐ AI PICK</span> ' : ''}${route.name}</h3>
      <div class="route-meta"><span>📏 ${route.distanceKm.toFixed(2)} km</span><span>🔁 Loop — back to start</span></div>
      <div class="score">${VIBE_LABELS[state.vibe]} match: <b>${route.vibeMatch}%</b> · Safety: <b>${route.scores.safety}%</b></div>
      ${route.explanation ? `<p class="ai-explain">${route.explanation}</p>` : ''}
      ${route.scores.highlights.length ? `<ul class="highlights">${route.scores.highlights.slice(0, 3).map(h => `<li>${h}</li>`).join('')}</ul>` : ''}`;
    card.onclick = () => selectRoute(route.id, true);
    wrap.appendChild(card);
  });
}
function updateSelectedBar() {
  const route = state.routes.find(r => r.id === state.selectedId);
  const show = route && !state.run && state.sheet === 'collapsed';
  $('selectedBar').classList.toggle('hidden', !show);
  if (route) {
    $('selectedName').textContent = route.name;
    $('selectedMeta').textContent = `${route.distanceKm.toFixed(2)} km · ${VIBE_LABELS[state.vibe]} ${route.vibeMatch}% · Safety ${route.scores.safety}%`;
  }
}
function selectRoute(id, collapseSheet) {
  state.selectedId = id;
  drawRoutes(); renderCards();
  const route = state.routes.find(r => r.id === id);
  if (!route) return;
  const detail = $('routeDetail');
  detail.classList.remove('hidden');
  const steps = route.maneuvers.filter(m => m.km > 0.01).slice(0, 18);
  detail.innerHTML = `
    <h2>${route.name}</h2>
    <div class="route-meta"><span>📏 ${route.distanceKm.toFixed(2)} km</span><span>🔁 Starts &amp; finishes at your location</span></div>
    <div class="score">Vibe match <b>${route.vibeMatch}%</b> · Safety <b>${route.scores.safety}%</b> · Nature ${route.scores.nature}% · Scenic ${route.scores.scenic}% · Urban ${route.scores.urban}%</div>
    ${state.aiReason && state.routes[0] && route.id === state.routes[0].id ? `<p class="ai-explain">AI decision: ${state.aiReason}</p>` : ''}
    ${route.explanation ? `<p class="ai-explain">${route.explanation}</p>` : ''}
    <p class="hint">Turn-by-turn preview:</p>
    <ol>${steps.map(m => `<li>${m.instruction} <em>(${m.km.toFixed(2)} km)</em></li>`).join('')}</ol>
    <button class="btn btn-primary" id="btnStartRunDetail">▶ Start Run — track me</button>`;
  $('btnStartRunDetail').onclick = () => startRun(route);
  if (collapseSheet) setSheet('collapsed'); // pull sheet down so the user sees the route on the map
  updateSelectedBar();
}
$('btnStartRunBar').onclick = () => {
  const route = state.routes.find(r => r.id === state.selectedId);
  if (route) startRun(route);
};

/* ================= GENERATE (runs independently of sheet position) ================= */
function setLoading(text) {
  $('loadingText').textContent = text;
  setStatus(text);
  if (state.sheet !== 'full' && state.sheet !== 'half') {
    $('genPill').classList.remove('hidden', 'ready');
    $('genPillText').textContent = text;
  } else {
    $('genPill').classList.add('hidden');
  }
}
$('genPill').onclick = () => { setSheet('full'); $('genPill').classList.add('hidden'); };

async function generateRoutes() {
  if (state.generating) return;
  state.generating = true;
  $('loadingBox').classList.remove('hidden');
  $('selectedBar').classList.add('hidden');
  try {
    const featuresPromise = fetchVibeFeatures(state.distanceKm);
    const rotations = [5, 35, 65];
    const raw = [];
    for (let i = 0; i < rotations.length; i++) {
      setLoading(`Designing loop ${i + 1} of 3 — calibrating to ${state.distanceKm.toFixed(1)} km…`);
      raw.push(await generateLoop(state.distanceKm, rotations[i]));
      await sleep(300);
    }
    setLoading('Scoring vibes — parks, rivers, cafés, landmarks…');
    const features = await featuresPromise;
    state.routes = raw.map((route, i) => {
      const scores = scoreRoute(route, features);
      return { id: `r${i}`, ...route, scores, vibeMatch: vibeScore(scores, state.vibe), name: routeName(scores, rotations[i], i) };
    }).sort((a, b) => b.vibeMatch - a.vibeMatch);
    state.selectedId = state.routes[0].id;
    drawRoutes(); renderCards(); selectRoute(state.selectedId, false);
    enhanceWithAi(); // Meta AI names + explains the routes (async, does not block)
    setStatus(`Done — 3 loops from your location, best ${VIBE_LABELS[state.vibe]} match first.`);
    if (state.sheet === 'collapsed' || state.sheet === 'hidden') {
      $('genPill').classList.remove('hidden'); $('genPill').classList.add('ready');
      $('genPillText').textContent = '✓ 3 routes ready — tap to view';
    }
  } catch (err) {
    console.error(err);
    setStatus('Routing service hiccup — please try Generate again in a few seconds.');
    $('genPill').classList.add('hidden');
  } finally {
    state.generating = false;
    $('loadingBox').classList.add('hidden');
  }
}

/* ================= AI LAYER (frontend) ================= */
function applyVibe(vibe) {
  if (!vibe || !VIBE_LABELS[vibe]) return;
  state.vibe = vibe; // decided by AI — no manual vibe picker anymore
}
function applyDistance(km) {
  if (!km) return;
  state.distanceKm = Math.min(15, Math.max(2, Math.round(km * 2) / 2)); // decided by AI
  $('pillDistance').textContent = `${state.distanceKm}K route`;
}

/* After routes exist, Meta AI gives each loop a real name + explanation
   based ONLY on computed facts (distance, scores, highlights). */
async function enhanceWithAi() {
  try {
    let data = await postJson('/api/ai/explain', {
      vibe: state.vibe,
      routes: state.routes.map(r => ({ name: r.name, distanceKm: r.distanceKm, vibeMatch: r.vibeMatch, scores: r.scores })),
    });
    if (!data) { // static hosting: local explanation templates
      data = { mode: 'fallback', items: state.routes.map((r, i) => {
        const h = (r.scores && r.scores.highlights) || [];
        return { index: i, name: r.name, explanation: `A ${r.distanceKm.toFixed(1)} km loop ${h.length ? `past ${h.slice(0, 2).join(' and ')}` : 'through your neighborhood streets'} — ${r.vibeMatch}% ${state.vibe} match, always ending back at your start.` };
      }) };
    }
    for (const item of data.items || []) {
      const route = state.routes[item.index];
      if (!route) continue;
      if (item.name) route.name = item.name;
      if (item.explanation) route.explanation = item.explanation;
    }
    renderCards();
    if (state.selectedId) selectRoute(state.selectedId, false);
    $('aiMode').textContent = data.mode === 'llm'
      ? `✨ Route names & explanations by Meta AI (${data.model})`
      : 'Route explanations by local fallback — set MODEL_API_KEY on the backend to enable Meta AI.';
  } catch (e) { /* routes already usable without AI text */ }
}

/* (1) AI DECIDE: mood + time -> AI picks distance, vibe, route, and explains why */
function chipGroup(id, attr, apply) {
  $(id).addEventListener('click', (e) => {
    const btn = e.target.closest(`[data-${attr}]`); if (!btn) return;
    document.querySelectorAll(`#${id} .chip`).forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    apply(btn.dataset[attr]);
  });
}
chipGroup('moodChips', 'mood', v => { state.mood = v; });
chipGroup('timeChips', 'min', v => { state.minutes = parseInt(v, 10); });

/* Local fallbacks (mirror the backend heuristics) for static hosting without a backend */
function localDecide(mood, minutes) {
  const table = {
    stressed: { vibe: 'nature', pace: 7.0, maxKm: 8, reason: 'Kamu sedang stres — AI memilih rute nature yang teduh dan santai supaya lari terasa menenangkan, bukan menambah beban.' },
    tired: { vibe: 'scenic', pace: 7.5, maxKm: 6, reason: 'Energi kamu lagi rendah — AI memilih rute scenic pendek dekat air yang ringan dijalani tapi tetap memberi pemandangan menyegarkan.' },
    fresh: { vibe: 'surprise', pace: 6.5, maxKm: 10, reason: 'Kamu lagi fresh — AI memilih rute kejutan yang bervariasi supaya larinya seru dan tidak membosankan.' },
    energetic: { vibe: 'urban', pace: 5.8, maxKm: 12, reason: 'Energi kamu lagi tinggi — AI memilih rute urban yang hidup dan sedikit lebih jauh untuk membakar energi itu.' },
  };
  const t = table[mood] || table.fresh;
  return { distanceKm: Math.min(t.maxKm, Math.max(2, Math.round((minutes / t.pace) * 2) / 2)), vibe: t.vibe, reason: t.reason };
}
function localRefine(text, current) {
  const t = (text || '').toLowerCase();
  const boost = [];
  let vibe = current.vibe, distanceKm = current.distanceKm, action = 'rerank';
  if (/hijau|green|alam|nature|taman|park|teduh|shady/.test(t)) { boost.push('nature'); vibe = 'nature'; }
  if (/sungai|river|danau|lake|air|water|embung|pantai/.test(t)) { boost.push('scenic'); vibe = 'scenic'; }
  if (/sejarah|historic|landmark|wisata|candi/.test(t)) { boost.push('historic'); vibe = 'historic'; }
  if (/aman|safe|sepi|quiet|(hindari|tidak|jangan|kurang)[^.]*ramai/.test(t)) boost.push('safety');
  if (/pendek|shorter|kurang jauh/.test(t)) { distanceKm = Math.max(2, current.distanceKm - 1.5); action = 'regenerate'; }
  if (/jauh|panjang|longer|tambah jarak/.test(t)) { distanceKm = Math.min(15, current.distanceKm + 1.5); action = 'regenerate'; }
  if (!boost.length && action === 'rerank') boost.push('nature');
  return { action, distanceKm, vibe, boost, reason: `AI menyesuaikan rute: ${action === 'regenerate' ? `jarak baru ${distanceKm} km` : `mengutamakan aspek ${boost.join(', ')}`} dengan vibe ${vibe}.` };
}

$('btnAiDecide').onclick = async () => {
  const btn = $('btnAiDecide');
  btn.disabled = true;
  $('aiMode').textContent = `AI is deciding your run (mood: ${state.mood}, ${state.minutes} min)…`;
  try {
    let data = await postJson('/api/ai/decide', { mood: state.mood, minutes: state.minutes });
    if (!data) data = { mode: 'fallback', model: 'local-heuristics', ...localDecide(state.mood, state.minutes) };
    applyDistance(data.distanceKm);
    applyVibe(data.vibe);
    state.aiReason = data.reason || null;
    $('aiMode').textContent = `AI decided (${data.mode === 'llm' ? 'Meta ' + data.model : 'local fallback'}): ${state.distanceKm} km · ${VIBE_LABELS[state.vibe]} — ${data.reason || ''}`;
    setStatus('AI picked your run. Generating your loops…');
    generateRoutes();
  } catch (e) {
    $('aiMode').textContent = 'AI unreachable — generating with your manual settings.';
    generateRoutes();
  } finally {
    btn.disabled = false;
  }
};

/* (2) REFINE: conversational iteration — rerank existing loops or regenerate */
$('btnRefine').onclick = async () => {
  const text = $('refineInput').value.trim();
  if (!text) { $('refineStatus').textContent = 'Type a refinement first — e.g. "kurang hijau, tambahkan sungai".'; return; }
  if (!state.routes.length) { $('refineStatus').textContent = 'Generate routes first, then refine them.'; return; }
  const btn = $('btnRefine');
  btn.disabled = true;
  $('refineStatus').textContent = 'AI is refining your routes…';
  try {
    let data = await postJson('/api/ai/refine', { text, current: { distanceKm: state.distanceKm, vibe: state.vibe } });
    if (!data) data = { mode: 'fallback', ...localRefine(text, { distanceKm: state.distanceKm, vibe: state.vibe }) };
    if (data.vibe) applyVibe(data.vibe);
    $('refineStatus').textContent = `${data.reason || 'Routes refined.'} (${data.mode === 'llm' ? 'Meta AI' : 'local fallback'})`;
    if (data.action === 'regenerate' && data.distanceKm && Math.abs(data.distanceKm - state.distanceKm) >= 0.4) {
      applyDistance(data.distanceKm);
      setStatus('AI changed the distance — regenerating loops…');
      generateRoutes();
      return;
    }
    const boost = (data.boost && data.boost.length) ? data.boost : ['nature'];
    state.routes.forEach(r => {
      const base = vibeScore(r.scores, state.vibe);
      const boostAvg = boost.reduce((s, b) => s + (r.scores[b] || 0), 0) / boost.length;
      r.vibeMatch = base;
      r.sortScore = Math.round(0.6 * base + 0.4 * boostAvg);
    });
    state.routes.sort((a, b) => b.sortScore - a.sortScore);
    state.selectedId = state.routes[0].id;
    drawRoutes(); renderCards(); selectRoute(state.selectedId, false);
    setStatus(`AI refined your routes — new best match: ${state.routes[0].name}.`);
  } catch (e) {
    $('refineStatus').textContent = 'AI unreachable — routes unchanged.';
  } finally {
    btn.disabled = false;
  }
};
$('refineInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btnRefine').click(); });

/* (5) AUDIO GUIDE: spoken narration (Web Speech API) at route highlights */
function speak(text) {
  if (!state.voiceOn || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'id-ID'; u.rate = 1.02;
    speechSynthesis.speak(u);
  } catch (e) { /* voice unavailable */ }
}
$('btnVoice').onclick = () => {
  state.voiceOn = !state.voiceOn;
  $('btnVoice').textContent = state.voiceOn ? '🔊' : '🔇';
  if (!state.voiceOn && 'speechSynthesis' in window) speechSynthesis.cancel();
};

/* ================= LIVE TRACKING (simulated GPS for demo) ================= */
function startRun(route) {
  stopRun(false);
  setSheet('hidden');
  $('mapTitle').textContent = 'Current jogging';
  $('selectedBar').classList.add('hidden');
  $('congratsModal').classList.add('hidden');
  $('runHud').classList.remove('hidden');
  $('btnPauseRun').textContent = '❚❚';
  const total = route.coords.length;
  state.run = { route, idx: 0, elapsedSec: 0, paused: false, timer: null, announced: new Set(), guideText: {} };
  // Audio guide: AI writes one narration per highlight; spoken when you pass it
  const guidePoints = (route.scores && route.scores.highlightPoints) || [];
  if (guidePoints.length) {
    fetch(API_BASE + '/api/ai/guide', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vibe: state.vibe, points: guidePoints }),
    }).then(r => r.json()).then(d => {
      if (state.run) (d.items || []).forEach(it => { state.run.guideText[it.name] = it.narration; });
    }).catch(() => {});
  }
  speak(`Memulai rute ${route.name}. Ikuti garis ungu di peta. Selamat berlari!`);
  state.run.timer = setInterval(() => {
    const run = state.run;
    if (!run || run.paused) return;
    run.elapsedSec += 0.1;
    run.idx = Math.min(total - 1, run.idx + Math.max(1, Math.floor(total / 600))); // ~60s demo loop
    const c = route.coords[run.idx];
    startMarker.setLngLat(c); // tracked position follows the loop
    map.easeTo({ center: c, duration: 90 });
    for (const p of (route.scores.highlightPoints || [])) {
      if (run.announced.has(p.name)) continue;
      if (distM({ lat: c[1], lon: c[0] }, p) <= 130) {
        run.announced.add(p.name);
        speak(run.guideText[p.name] || `Di dekatmu ada ${p.name}. Nikmati suasana di sekitar sini sambil menjaga ritme larimu.`);
      }
    }
    const frac = run.idx / (total - 1);
    const doneKm = route.distanceKm * frac;
    $('hudDistance').textContent = `${doneKm.toFixed(2)} km`;
    $('hudKcal').textContent = `${Math.round(doneKm * 62)} kcal`;
    $('hudRemaining').textContent = `${(route.distanceKm - doneKm).toFixed(2)} km`;
    $('hudTime').textContent = fmtClock(run.elapsedSec);
    $('hudProgress').style.width = `${frac * 100}%`;
    let acc = 0; const target = frac * route.distanceKm;
    for (const m of route.maneuvers) { acc += m.km; if (acc >= target) { $('hudInstruction').textContent = m.instruction; break; } }
    if (run.idx >= total - 1) finishRun();
  }, 100);
  $('hudInstruction').textContent = route.maneuvers[0] ? route.maneuvers[0].instruction : 'Follow the highlighted loop';
}
function finishRun() {
  const run = state.run; if (!run) return;
  const { route, elapsedSec } = run;
  const kcal = Math.round(route.distanceKm * 62);
  saveHistory({ date: new Date().toISOString(), name: route.name, km: route.distanceKm, kcal, vibe: state.vibe, vibeMatch: route.vibeMatch, safety: route.scores.safety, coords: route.coords });
  stopRun(false);
  speak(`Selamat! Kamu menyelesaikan ${route.name}, ${route.distanceKm.toFixed(1)} kilometer. Kerja bagus!`);
  $('congratsText').textContent = `You completed the ${route.name} and arrived back at your start. No getting lost — the loop brought you home.`;
  $('congratsStats').innerHTML = `
    <div><span>Distance</span><strong>${route.distanceKm.toFixed(2)} km</strong></div>
    <div><span>Time</span><strong>${fmtClock(elapsedSec)}</strong></div>
    <div><span>Calories</span><strong>${kcal} kcal</strong></div>
    <div><span>${VIBE_LABELS[state.vibe]} match</span><strong>${route.vibeMatch}%</strong></div>`;
  $('congratsModal').classList.remove('hidden');
}
function stopRun(showSheet = true) {
  if (state.run) { clearInterval(state.run.timer); state.run = null; }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  $('runHud').classList.add('hidden');
  $('mapTitle').textContent = 'Plan your run';
  startMarker.setLngLat([state.start.lon, state.start.lat]);
  if (showSheet) { setSheet('collapsed'); updateSelectedBar(); }
}
$('btnPauseRun').onclick = () => {
  const run = state.run; if (!run) return;
  run.paused = !run.paused;
  $('btnPauseRun').textContent = run.paused ? '▶' : '❚❚';
  if (run.paused && 'speechSynthesis' in window) speechSynthesis.cancel();
  if (run.paused) $('hudInstruction').textContent = 'Paused — tap ▶ to continue tracking';
};
$('btnStopRun').onclick = () => {
  const run = state.run;
  if (run && run.idx >= (run.route.coords.length - 2)) { finishRun(); return; }
  stopRun(true);
  setStatus('Run ended early. Your loop is still saved below — start again anytime.');
};
$('btnCongratsDone').onclick = () => {
  $('congratsModal').classList.add('hidden');
  setSheet('collapsed');
  updateSelectedBar();
  setStatus('Nice run! Generate a new loop or run this one again.');
};

/* auto-detect location on first load if already logged in */
if (state.user) autoLocate();
setSheet('collapsed');
