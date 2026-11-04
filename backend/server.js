// Runova backend — zero-dependency Node server.
// - Serves the frontend (../frontend)
// - Proxies routing (Valhalla) and vibe data (Overpass) so the browser
//   never talks to public fair-use servers directly, and requests carry
//   an identifying User-Agent as those services require.
// Run: node backend/server.js  →  http://localhost:5173
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5173;
const FRONTEND = path.join(__dirname, '..', 'frontend');
const UA = 'Runova/0.2 (Meta Hackathon demo)';
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function proxy(req, res, urls, contentType) {
  const body = await readBody(req);
  let lastErr;
  for (const url of urls) {
    try {
      const upstream = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': contentType, 'User-Agent': UA },
        body,
      });
      const text = await upstream.text();
      res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
      return res.end(text);
    } catch (e) { lastErr = e; }
  }
  res.writeHead(502, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'upstream unavailable', detail: String(lastErr) }));
}

/* ================= AI LAYER (Meta AI / Muse Spark) =================
   The LLM never invents streets: it only (1) parses the runner's natural
   language into structured preferences, and (2) names/explains routes using
   facts computed by the routing engine. Without MODEL_API_KEY it falls back
   to local heuristics so the demo still works. */
const AI_KEY = process.env.MODEL_API_KEY || process.env.META_API_KEY || '';
const AI_MODEL = process.env.META_MODEL || 'muse-spark-1.1';
const AI_BASE = (process.env.META_API_BASE_URL || 'https://api.meta.ai/v1').replace(/\/$/, '');

async function aiChat(messages) {
  if (!AI_KEY) return null;
  try {
    const r = await fetch(`${AI_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI_KEY}` },
      body: JSON.stringify({ model: AI_MODEL, messages, temperature: 0.4 }),
    });
    if (!r.ok) { console.error('AI upstream', r.status); return null; }
    const data = await r.json();
    return data.choices && data.choices[0] && data.choices[0].message.content || null;
  } catch (e) { console.error('AI call failed', e); return null; }
}
function parseJsonLoose(text) {
  if (!text) return null;
  try { return JSON.parse(text.replace(/```json|```/g, '').trim()); } catch (e) { return null; }
}

/* Local fallback parser (Indonesian + English keywords) */
function fallbackParse(text) {
  const t = (text || '').toLowerCase();
  const distMatch = t.match(/(\d+(?:[.,]\d+)?)\s*(km|k)\b/);
  let vibe = null;
  if (/sungai|river|danau|lake|pantai|embung|scenic|sunrise|sunset|water|view|pemandangan/.test(t)) vibe = 'scenic';
  else if (/sejarah|historic|heritage|landmark|wisata|tourist|candi|museum|kota tua/.test(t)) vibe = 'historic';
  else if (/kota|urban|city|cafe|kafe|ramai|lively|downtown/.test(t)) vibe = 'urban';
  else if (/alam|nature|hijau|taman|park|pohon|santai|relax|tenang|peaceful|sejuk/.test(t)) vibe = 'nature';
  else if (/surprise|acak|random|apa aja|bebas/.test(t)) vibe = 'surprise';
  const preferences = [];
  if (/sepi|tidak (terlalu )?ramai|gak (terlalu )?ramai|quiet|not crowded/.test(t)) preferences.push('avoid crowds');
  if (/datar|flat|rata/.test(t)) preferences.push('flat');
  if (/bukit|hilly|nanjak|tanjakan/.test(t)) preferences.push('hilly');
  if (/pagi|morning|sunrise/.test(t)) preferences.push('morning run');
  if (/sore|evening|sunset|senja/.test(t)) preferences.push('evening run');
  if (/aman|safe|safety|terang|well-lit|well lit/.test(t)) preferences.push('safe & well-lit');
  return { distanceKm: distMatch ? parseFloat(distMatch[1].replace(',', '.')) : null, vibe, preferences };
}

async function handleAiParse(req, res) {
  const body = JSON.parse((await readBody(req)).toString() || '{}');
  const text = body.text || '';
  let result = null, mode = 'fallback';
  const content = await aiChat([
    { role: 'system', content: 'You parse a runner\'s request (Indonesian or English) into JSON. Reply ONLY with JSON: {"distanceKm": number|null, "vibe": "nature"|"scenic"|"urban"|"historic"|"surprise"|null, "preferences": string[]}. Vibe meanings: nature=relaxing green/parks, scenic=water/views, urban=city energy/cafes, historic=landmarks/sightseeing.' },
    { role: 'user', content: text },
  ]);
  const parsed = parseJsonLoose(content);
  if (parsed && (parsed.distanceKm || parsed.vibe)) { result = parsed; mode = 'llm'; }
  if (!result) result = fallbackParse(text);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ mode, model: mode === 'llm' ? AI_MODEL : 'local-heuristics', ...result }));
}

async function handleAiExplain(req, res) {
  const body = JSON.parse((await readBody(req)).toString() || '{}');
  const routes = body.routes || [];
  const vibe = body.vibe || 'nature';
  let items = null, mode = 'fallback';
  const facts = routes.map((r, i) => ({ index: i, distanceKm: r.distanceKm, scores: r.scores, highlights: r.scores && r.scores.highlights }));
  const content = await aiChat([
    { role: 'system', content: 'You name and explain running loop routes. Use ONLY the facts given — never invent streets, places, or distances. Reply ONLY with a JSON array: [{"index":0,"name":"short catchy route name (max 5 words)","explanation":"one sentence, max 25 words, why this loop fits the vibe, mentioning a highlight if present"}]. Language: same as the vibe context, English is fine.' },
    { role: 'user', content: `Desired vibe: ${vibe}. Route facts: ${JSON.stringify(facts)}` },
  ]);
  const parsed = parseJsonLoose(content);
  if (Array.isArray(parsed) && parsed.length) { items = parsed; mode = 'llm'; }
  if (!items) {
    items = routes.map((r, i) => {
      const h = (r.scores && r.scores.highlights) || [];
      const where = h.length ? `past ${h.slice(0, 2).join(' and ')}` : 'through your neighborhood streets';
      return {
        index: i,
        name: r.name,
        explanation: `A ${r.distanceKm.toFixed(1)} km loop ${where} — ${r.vibeMatch}% ${vibe} match with a ${r.scores ? r.scores.safety : '-'}% safety score, always ending back at your start.`,
      };
    });
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ mode, model: mode === 'llm' ? AI_MODEL : 'local-heuristics', items }));
}

/* (1) AI DECIDE: mood + available time -> AI chooses distance, vibe, and why */
function fallbackDecide(mood, minutes) {
  const table = {
    stressed: { vibe: 'nature', pace: 7.0, maxKm: 8, reason: 'Kamu sedang stres — AI memilih rute nature yang teduh dan santai supaya lari terasa menenangkan, bukan menambah beban.' },
    tired: { vibe: 'scenic', pace: 7.5, maxKm: 6, reason: 'Energi kamu lagi rendah — AI memilih rute scenic pendek dekat air yang ringan dijalani tapi tetap memberi pemandangan menyegarkan.' },
    fresh: { vibe: 'surprise', pace: 6.5, maxKm: 10, reason: 'Kamu lagi fresh — AI memilih rute kejutan yang bervariasi supaya larinya seru dan tidak membosankan.' },
    energetic: { vibe: 'urban', pace: 5.8, maxKm: 12, reason: 'Energi kamu lagi tinggi — AI memilih rute urban yang hidup dan sedikit lebih jauh untuk membakar energi itu.' },
  };
  const t = table[mood] || table.fresh;
  const km = Math.min(t.maxKm, Math.max(2, Math.round((minutes / t.pace) * 2) / 2));
  return { distanceKm: km, vibe: t.vibe, reason: t.reason };
}
async function handleAiDecide(req, res) {
  const body = JSON.parse((await readBody(req)).toString() || '{}');
  const mood = body.mood || 'fresh';
  const minutes = Math.min(120, Math.max(10, body.minutes || 40));
  let result = null, mode = 'fallback';
  const content = await aiChat([
    { role: 'system', content: 'You are a running coach AI. Given the runner\'s mood and available minutes, decide their run. Assume easy pace 6-7.5 min/km depending on mood (tired/stressed slower). Reply ONLY JSON: {"distanceKm": number (2-15, .5 steps), "vibe": "nature"|"scenic"|"urban"|"historic"|"surprise", "reason": "one friendly sentence in Bahasa Indonesia explaining the decision"}' },
    { role: 'user', content: `Mood: ${mood}. Available time: ${minutes} minutes.` },
  ]);
  const parsed = parseJsonLoose(content);
  if (parsed && parsed.distanceKm && parsed.vibe) { result = parsed; mode = 'llm'; }
  if (!result) result = fallbackDecide(mood, minutes);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ mode, model: mode === 'llm' ? AI_MODEL : 'local-heuristics', ...result }));
}

/* (2) REFINE: "kurang hijau / tambahkan sungai / pendekkan" -> rerank or regenerate */
function fallbackRefine(text, current) {
  const t = (text || '').toLowerCase();
  const boost = [];
  let vibe = current.vibe, distanceKm = current.distanceKm, action = 'rerank';
  if (/hijau|green|alam|nature|taman|park|teduh|shady/.test(t)) { boost.push('nature'); vibe = 'nature'; }
  if (/sungai|river|danau|lake|air|water|embung|pantai/.test(t)) { boost.push('scenic'); vibe = 'scenic'; }
  if (/ramai|hidup|lively|kota|city|urban|cafe/.test(t) && !/hindari|tidak|gak|jangan/.test(t)) { boost.push('urban'); vibe = 'urban'; }
  if (/sejarah|historic|landmark|wisata|candi/.test(t)) { boost.push('historic'); vibe = 'historic'; }
  if (/aman|safe|sepi|quiet|(hindari|tidak|jangan|kurang)[^.]*ramai/.test(t)) boost.push('safety');
  if (/pendek|shorter|kurang jauh|dekatkan/.test(t)) { distanceKm = Math.max(2, current.distanceKm - 1.5); action = 'regenerate'; }
  if (/jauh|panjang|longer|tambah jarak/.test(t)) { distanceKm = Math.min(15, current.distanceKm + 1.5); action = 'regenerate'; }
  if (!boost.length && action === 'rerank') boost.push('nature');
  return { action, distanceKm, vibe, boost, reason: `AI menyesuaikan rute: ${action === 'regenerate' ? `jarak baru ${distanceKm} km` : `mengutamakan aspek ${boost.join(', ')}`} dengan vibe ${vibe}.` };
}
async function handleAiRefine(req, res) {
  const body = JSON.parse((await readBody(req)).toString() || '{}');
  const current = body.current || { distanceKm: 5, vibe: 'nature' };
  let result = null, mode = 'fallback';
  const content = await aiChat([
    { role: 'system', content: 'A runner wants to refine generated loop routes (Indonesian/English). Current settings given. Decide: action="regenerate" ONLY if distance must change, else "rerank". boost is a subset of ["nature","scenic","urban","historic","safety"] to prioritize. Reply ONLY JSON: {"action":"rerank"|"regenerate","distanceKm":number,"vibe":"nature"|"scenic"|"urban"|"historic"|"surprise","boost":string[],"reason":"one short sentence in Bahasa Indonesia"}' },
    { role: 'user', content: `Current: ${JSON.stringify(current)}. Runner says: "${body.text || ''}"` },
  ]);
  const parsed = parseJsonLoose(content);
  if (parsed && parsed.action) { result = parsed; mode = 'llm'; }
  if (!result) result = fallbackRefine(body.text, current);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ mode, model: mode === 'llm' ? AI_MODEL : 'local-heuristics', ...result }));
}

/* (5) AUDIO GUIDE: one short narration per named highlight on the route */
async function handleAiGuide(req, res) {
  const body = JSON.parse((await readBody(req)).toString() || '{}');
  const points = (body.points || []).slice(0, 6);
  const vibe = body.vibe || 'nature';
  let items = null, mode = 'fallback';
  if (points.length) {
    const content = await aiChat([
      { role: 'system', content: 'You are a running tour-guide voice. For each named place, write ONE short spoken narration (max 20 words, Bahasa Indonesia, friendly, present tense, starts by locating it e.g. "Di dekatmu ada..."). Reply ONLY JSON array: [{"name":"...","narration":"..."}]. Never invent facts beyond the name.' },
      { role: 'user', content: `Run vibe: ${vibe}. Places: ${JSON.stringify(points.map(p => p.name))}` },
    ]);
    const parsed = parseJsonLoose(content);
    if (Array.isArray(parsed) && parsed.length) { items = parsed; mode = 'llm'; }
  }
  if (!items) {
    items = points.map(p => ({ name: p.name, narration: `Di dekatmu ada ${p.name}. Nikmati suasana di sekitar sini sambil menjaga ritme larimu.` }));
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ mode, model: mode === 'llm' ? AI_MODEL : 'local-heuristics', items }));
}

const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ app: 'Runova', status: 'ok', time: new Date().toISOString() }));
  }
  if (req.method === 'POST' && urlPath === '/api/route') {
    return proxy(req, res, ['https://valhalla1.openstreetmap.de/route'], 'application/json');
  }
  if (req.method === 'POST' && urlPath === '/api/vibe') {
    return proxy(req, res,
      ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'],
      'application/x-www-form-urlencoded');
  }
  if (req.method === 'POST' && urlPath === '/api/ai/parse') return handleAiParse(req, res);
  if (req.method === 'POST' && urlPath === '/api/ai/explain') return handleAiExplain(req, res);
  if (req.method === 'POST' && urlPath === '/api/ai/decide') return handleAiDecide(req, res);
  if (req.method === 'POST' && urlPath === '/api/ai/refine') return handleAiRefine(req, res);
  if (req.method === 'POST' && urlPath === '/api/ai/guide') return handleAiGuide(req, res);

  // static frontend
  const file = path.join(FRONTEND, path.normalize(urlPath === '/' ? 'index.html' : urlPath));
  if (!file.startsWith(FRONTEND)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`Runova backend serving frontend at http://localhost:${PORT}`));
