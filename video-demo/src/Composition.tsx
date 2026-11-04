import React from "react";
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

const PURPLE = "#625fe0";
const INK = "#1e2242";
const MUTED = "#8a90a8";
const BG = "#f3f4fa";

const fadeUp = (frame: number, delay: number, dur = 18) => ({
  opacity: interpolate(frame, [delay, delay + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  transform: `translateY(${interpolate(frame, [delay, delay + dur], [26, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
});

const Caption: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", left: 90, right: 90, bottom: 34, display: "flex", justifyContent: "center" }}>
    <div style={{ background: "rgba(10,14,35,0.88)", color: "#fff", fontSize: 25, lineHeight: 1.45, padding: "14px 26px", borderRadius: 16, textAlign: "center", maxWidth: 1020, fontFamily: "Inter, system-ui, sans-serif" }}>{text}</div>
  </div>
);

const Phone: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ width: 300, height: 610, background: "#fff", borderRadius: 42, border: "10px solid #141830", boxShadow: "0 34px 70px rgba(35,35,100,0.28)", overflow: "hidden", position: "relative", fontFamily: "Inter, system-ui, sans-serif", ...style }}>
    {children}
  </div>
);

const MiniMap: React.FC<{ children?: React.ReactNode; height?: number }> = ({ children, height = 610 }) => (
  <svg width="100%" height={height} viewBox="0 0 300 610" style={{ display: "block", background: "#eceef3" }}>
    <rect width="300" height="610" fill="#eceef3" />
    {Array.from({ length: 9 }).map((_, i) => (
      <line key={`v${i}`} x1={i * 38} y1="0" x2={i * 38 - 30} y2="610" stroke="#ffffff" strokeWidth={i % 3 === 0 ? 13 : 7} />
    ))}
    {Array.from({ length: 13 }).map((_, i) => (
      <line key={`h${i}`} x1="0" y1={i * 50} x2="300" y2={i * 50 + 24} stroke="#ffffff" strokeWidth={i % 3 === 0 ? 13 : 7} />
    ))}
    <path d="M -10 430 C 70 400, 90 470, 160 440 S 280 380, 310 410" fill="none" stroke="#bfe3f7" strokeWidth="17" />
    <ellipse cx="72" cy="150" rx="52" ry="36" fill="#dcebd2" />
    <ellipse cx="238" cy="520" rx="58" ry="40" fill="#dcebd2" />
    <ellipse cx="245" cy="120" rx="34" ry="24" fill="#e3e8f7" />
    {children}
  </svg>
);

const LOOP_PATH = "M 150 120 C 225 120, 245 205, 225 285 C 208 352, 235 430, 175 468 C 118 503, 55 452, 62 372 C 68 298, 48 205, 84 152 C 102 126, 122 120, 150 120 Z";

/* ---------------- Scene 1: Hook + problem (0–20s) ---------------- */
const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(140deg, #171b42, #2a2570 60%, #625fe0)", fontFamily: "Inter, system-ui, sans-serif", color: "#fff" }}>
      <div style={{ position: "absolute", left: 90, top: 120, width: 640 }}>
        <div style={{ ...fadeUp(frame, 5), display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 62, height: 62, borderRadius: 18, background: "linear-gradient(135deg,#8b8cf5,#5653d8)", display: "grid", placeItems: "center", fontSize: 34, fontWeight: 900 }}>R</div>
          <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: 1 }}>RUNOVA</span>
        </div>
        <div style={{ ...fadeUp(frame, 22), fontSize: 62, fontWeight: 900, lineHeight: 1.12, marginTop: 42 }}>
          You say how you feel.<br />AI designs the run.
        </div>
        <div style={{ ...fadeUp(frame, 42), fontSize: 27, color: "#c6c9f5", lineHeight: 1.55, marginTop: 26, width: 560 }}>
          Running somewhere new is scary: you don't know what's safe, what's scenic — or how to get back.
        </div>
      </div>
      <div style={{ position: "absolute", right: 105, top: 58, ...fadeUp(frame, 55) }}>
        <Phone>
          <MiniMap>
            <circle cx="150" cy="300" r="10" fill={PURPLE} stroke="#fff" strokeWidth="3.5" />
            <circle cx="150" cy="300" r="24" fill="rgba(98,95,224,0.25)" />
            <text x="150" y="255" textAnchor="middle" fontSize="17" fill={INK} fontWeight="700">You are here…</text>
            <text x="150" y="352" textAnchor="middle" fontSize="15" fill={MUTED}>but where do you run?</text>
            <text x="76" y="120" fontSize="22">❓</text>
            <text x="215" y="200" fontSize="22">❓</text>
            <text x="105" y="490" fontSize="22">❓</text>
          </MiniMap>
        </Phone>
      </div>
      <Caption text="This is Runova — an AI running partner for Depok, Yogyakarta, and anywhere you've never run before." />
    </AbsoluteFill>
  );
};

/* ---------------- Scene 2: How's your day? (20–45s) ---------------- */
const Chip: React.FC<{ label: string; active?: boolean }> = ({ label, active }) => (
  <span style={{ padding: "9px 15px", borderRadius: 999, fontSize: 15.5, fontWeight: 700, background: active ? "linear-gradient(135deg,#7d7ff0,#5653d8)" : "#eef0fa", color: active ? "#fff" : "#4a5170", border: active ? "none" : "1.5px solid #e7e8f2" }}>{label}</span>
);

const SceneDecide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const btnScale = spring({ frame: frame - 300, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ position: "absolute", left: 90, top: 130, width: 560 }}>
        <div style={{ ...fadeUp(frame, 5), fontSize: 54, fontWeight: 900, color: INK, lineHeight: 1.15 }}>No distance sliders.<br />No vibe dropdowns.</div>
        <div style={{ ...fadeUp(frame, 28), fontSize: 26, color: "#4a5170", lineHeight: 1.6, marginTop: 26 }}>
          Runova just asks how your day is going — then <b style={{ color: PURPLE }}>Meta AI decides everything</b>: the distance, the vibe, and the route.
        </div>
        <div style={{ ...fadeUp(frame, 90), marginTop: 34, background: "#fff", borderRadius: 18, padding: "18px 20px", boxShadow: "0 12px 28px rgba(90,90,180,0.12)", width: 500 }}>
          <div style={{ fontSize: 15, color: MUTED, fontWeight: 700, marginBottom: 8 }}>AI DECISION</div>
          <div style={{ fontSize: 21, color: INK, lineHeight: 1.5 }}>"You're stressed with 40 minutes free → a calming <b>5.5K nature loop</b>, shaded and quiet."</div>
        </div>
      </div>
      <div style={{ position: "absolute", right: 105, top: 58, ...fadeUp(frame, 40) }}>
        <Phone>
          <div style={{ padding: "26px 20px", background: "#f7f8fc", height: "100%" }}>
            <div style={{ background: "#fff", borderRadius: 22, padding: 18, boxShadow: "0 10px 24px rgba(90,90,180,0.1)" }}>
              <div style={{ fontSize: 19, fontWeight: 800, color: INK }}>Hi Akmal, how's your day today?</div>
              <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.5 }}>Tell me how you feel — I'll decide the distance, the vibe, and design the loop for you.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 6 }}>
                <Chip label="😩 Stressed" active />
                <Chip label="🪫 Tired" />
                <Chip label="✨ Fresh" />
                <Chip label="🔥 Energetic" />
              </div>
              <div style={{ fontSize: 13, color: MUTED, margin: "16px 0 8px" }}>And how much time do you have?</div>
              <div style={{ display: "flex", gap: 7 }}>
                <Chip label="20 min" />
                <Chip label="40 min" active />
                <Chip label="60 min" />
              </div>
              <div style={{ marginTop: 22, background: "linear-gradient(135deg,#7d7ff0,#5653d8)", color: "#fff", textAlign: "center", fontWeight: 800, fontSize: 17, borderRadius: 15, padding: "14px 0", transform: `scale(${0.92 + btnScale * 0.08})`, boxShadow: "0 12px 24px rgba(98,95,224,0.4)" }}>Let's Run →</div>
            </div>
          </div>
        </Phone>
      </div>
      <Caption text="One tap on Let's Run — Muse Spark turns your mood and free time into a concrete run plan." />
    </AbsoluteFill>
  );
};

/* ---------------- Scene 3: AI builds 3 loops (45–75s) ---------------- */
const SceneRoutes: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [30, 170], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cards = [
    { name: "Embung Tambakboyo Loop", km: "5.48 km", match: 92, safe: 86, tag: "⭐ AI PICK", delay: 190 },
    { name: "Tambakbayan River Loop", km: "5.61 km", match: 84, safe: 81, tag: "", delay: 225 },
    { name: "North Green Loop 3", km: "5.37 km", match: 71, safe: 78, tag: "", delay: 260 },
  ];
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ position: "absolute", left: 90, top: 105, width: 500 }}>
        <div style={{ ...fadeUp(frame, 5), fontSize: 48, fontWeight: 900, color: INK, lineHeight: 1.18 }}>Three loops.<br />All bring you home.</div>
        <div style={{ ...fadeUp(frame, 26), fontSize: 24, color: "#4a5170", lineHeight: 1.6, marginTop: 22 }}>
          Every route is a <b>closed loop on real OpenStreetMap paths</b> — it starts and finishes at your GPS location, calibrated to the AI's distance. Then each is scored against parks, rivers, cafés and landmarks.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 30, width: 470 }}>
          {cards.map((c) => (
            <div key={c.name} style={{ ...fadeUp(frame, c.delay, 16), background: "#fff", borderRadius: 17, padding: "13px 17px", boxShadow: "0 10px 22px rgba(90,90,180,0.12)", border: c.tag ? `2.5px solid ${PURPLE}` : "2.5px solid transparent" }}>
              <div style={{ fontSize: 17.5, fontWeight: 800, color: INK }}>{c.tag ? <span style={{ background: "linear-gradient(135deg,#7d7ff0,#5653d8)", color: "#fff", fontSize: 11, padding: "3px 9px", borderRadius: 999, marginRight: 8 }}>{c.tag}</span> : null}{c.name}</div>
              <div style={{ fontSize: 14.5, color: MUTED, marginTop: 5 }}>📏 {c.km} · 🔁 Loop · Nature match <b style={{ color: PURPLE }}>{c.match}%</b> · Safety <b style={{ color: PURPLE }}>{c.safe}%</b></div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", right: 105, top: 58, ...fadeUp(frame, 18) }}>
        <Phone>
          <MiniMap>
            <path d={LOOP_PATH} fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" pathLength={100} strokeDasharray={100} strokeDashoffset={100 - draw * 100} />
            <path d={LOOP_PATH} fill="none" stroke={PURPLE} strokeWidth="6.5" strokeLinecap="round" pathLength={100} strokeDasharray={100} strokeDashoffset={100 - draw * 100} />
            <circle cx="150" cy="120" r="9" fill={PURPLE} stroke="#fff" strokeWidth="3.5" />
            <text x="150" y="90" textAnchor="middle" fontSize="14.5" fontWeight="800" fill={INK}>START = FINISH</text>
          </MiniMap>
        </Phone>
      </div>
      <Caption text="The routing engine guarantees the streets are real — the AI guarantees the loop feels right." />
    </AbsoluteFill>
  );
};

/* ---------------- Scene 4: Refine (75–100s) ---------------- */
const SceneRefine: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = "kurang hijau, tambahkan sungai, hindari yang ramai";
  const chars = Math.floor(interpolate(frame, [40, 170], [0, typed.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ position: "absolute", left: 90, top: 120, width: 560 }}>
        <div style={{ ...fadeUp(frame, 5), fontSize: 50, fontWeight: 900, color: INK, lineHeight: 1.18 }}>Not quite right?<br />Just tell the AI.</div>
        <div style={{ ...fadeUp(frame, 28), fontSize: 25, color: "#4a5170", lineHeight: 1.6, marginTop: 24 }}>
          Refine in your own words — Indonesian, English, or both. Muse Spark re-ranks the loops, or rebuilds them if the distance has to change.
        </div>
      </div>
      <div style={{ position: "absolute", right: 105, top: 58, ...fadeUp(frame, 35) }}>
        <Phone>
          <div style={{ padding: "24px 18px", background: "#f7f8fc", height: "100%" }}>
            <div style={{ background: "#fff", borderRadius: 20, padding: 16, boxShadow: "0 10px 24px rgba(90,90,180,0.1)" }}>
              <div style={{ fontSize: 16.5, fontWeight: 800, color: INK }}>🔁 Refine with AI</div>
              <div style={{ marginTop: 13, background: "#f5f6fb", border: "1.5px solid #e7e8f2", borderRadius: 13, padding: "12px 13px", fontSize: 14.5, color: INK, minHeight: 62 }}>
                {typed.slice(0, chars)}<span style={{ opacity: frame % 30 < 16 ? 1 : 0 }}>|</span>
              </div>
              <div style={{ marginTop: 12, background: "linear-gradient(135deg,#7d7ff0,#5653d8)", color: "#fff", textAlign: "center", fontWeight: 800, fontSize: 15, borderRadius: 12, padding: "11px 0" }}>Refine</div>
            </div>
            <div style={{ ...fadeUp(frame, 210, 18), marginTop: 16, background: "#fff", borderRadius: 20, padding: 16, border: `2.5px solid ${PURPLE}`, boxShadow: "0 12px 26px rgba(98,95,224,0.22)" }}>
              <div style={{ fontSize: 12, color: PURPLE, fontWeight: 800 }}>NEW AI PICK</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: INK, marginTop: 4 }}>Tambakbayan River Loop</div>
              <div style={{ fontSize: 14, color: MUTED, marginTop: 5 }}>Scenic 96% · Safety 88% · re-ranked in 1 tap</div>
            </div>
          </div>
        </Phone>
      </div>
      <Caption text="“Less green, add a river, avoid crowds” — the AI understands, and the ranking changes instantly." />
    </AbsoluteFill>
  );
};

/* ---------------- Scene 5: Live run + audio guide (100–140s) ---------------- */
const SceneRun: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [20, 1080], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const secs = Math.floor(progress * 32 * 60);
  const time = `${Math.floor(secs / 3600)}:${String(Math.floor((secs % 3600) / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const guideAt = (from: number, name: string, text: string) => {
    const enter = interpolate(frame, [from, from + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const exit = interpolate(frame, [from + 185, from + 210], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (
      <div style={{ position: "absolute", left: 16, right: 16, top: 84, background: "rgba(13,18,48,0.93)", color: "#fff", borderRadius: 15, padding: "11px 14px", fontSize: 13.5, lineHeight: 1.5, opacity: Math.min(enter, exit), transform: `translateY(${(1 - enter) * 14}px)` }}>
        🔊 <b>{name}</b> — {text}
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ position: "absolute", left: 90, top: 120, width: 540 }}>
        <div style={{ ...fadeUp(frame, 5), fontSize: 50, fontWeight: 900, color: INK, lineHeight: 1.18 }}>Then just run.<br />Runova guides you.</div>
        <div style={{ ...fadeUp(frame, 28), fontSize: 25, color: "#4a5170", lineHeight: 1.65, marginTop: 24 }}>
          Live tracking follows the loop with turn-by-turn instructions — and when you pass a landmark, the <b style={{ color: PURPLE }}>AI audio guide</b> speaks: a tiny tour, written by Muse Spark, exactly where you are.
        </div>
      </div>
      <div style={{ position: "absolute", right: 105, top: 58, ...fadeUp(frame, 20) }}>
        <Phone>
          <MiniMap>
            <path d={LOOP_PATH} fill="none" stroke="#d9d7f5" strokeWidth="6.5" strokeLinecap="round" pathLength={100} strokeDasharray={100} />
            <path d={LOOP_PATH} fill="none" stroke={PURPLE} strokeWidth="6.5" strokeLinecap="round" pathLength={100} strokeDasharray={100} strokeDashoffset={100 - progress * 100} />
          </MiniMap>
          <div style={{ position: "absolute", width: 21, height: 21, borderRadius: "50%", background: PURPLE, border: "3.5px solid #fff", boxShadow: "0 0 0 9px rgba(98,95,224,0.3)", offsetPath: `path("${LOOP_PATH}")`, offsetDistance: `${progress * 100}%`, left: 0, top: 0 } as React.CSSProperties} />
          {guideAt(330, "Embung Tambakboyo", "a calm lake loved by local runners. Enjoy the breeze along the water.")}
          {guideAt(760, "Sungai Tambakbayan", "follow the river path — shaded, quiet, and well-lit from here.")}
          <div style={{ position: "absolute", left: 14, right: 14, bottom: 14, background: "#fff", borderRadius: 22, padding: "15px 17px", boxShadow: "0 16px 34px rgba(40,40,110,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 12, color: MUTED }}>Running time</div>
                <div style={{ fontSize: 33, fontWeight: 800, color: INK }}>{time}</div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: "linear-gradient(135deg,#7d7ff0,#5653d8)", color: "#fff", display: "grid", placeItems: "center", fontSize: 14 }}>❚❚</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e7e8f2", marginTop: 9, paddingTop: 10, fontSize: 13.5, color: MUTED }}>
              <span>🏃 <b style={{ color: INK }}>{(progress * 5.48).toFixed(2)} km</b></span>
              <span>🔥 <b style={{ color: INK }}>{Math.round(progress * 340)} kcal</b></span>
              <span>📍 <b style={{ color: INK }}>{(5.48 - progress * 5.48).toFixed(2)} km left</b></span>
            </div>
          </div>
        </Phone>
      </div>
      <Caption text="Sightseeing while you sweat — the loop ends exactly where you started. You can't get lost." />
    </AbsoluteFill>
  );
};

/* ---------------- Scene 6: Congrats + home (140–160s) ---------------- */
const SceneDone: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ position: "absolute", left: 90, top: 120, width: 540 }}>
        <div style={{ ...fadeUp(frame, 5), fontSize: 52, fontWeight: 900, color: INK, lineHeight: 1.16 }}>Every finish line<br />is your front door.</div>
        <div style={{ ...fadeUp(frame, 28), fontSize: 25, color: "#4a5170", lineHeight: 1.65, marginTop: 24 }}>
          Completed loops are saved automatically — weekly goals fill up, your route history grows, and Runova learns what a good run means to you.
        </div>
      </div>
      <div style={{ position: "absolute", right: 105, top: 58, ...fadeUp(frame, 25) }}>
        <Phone>
          <div style={{ padding: "30px 22px", textAlign: "center", background: "#fff", height: "100%" }}>
            <div style={{ fontSize: 54, marginTop: 26 }}>🎉</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: INK }}>Congratulations!</div>
            <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.55 }}>You completed the Embung Tambakboyo Loop and arrived back at your start.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 14 }}>
              {[["Distance", "5.48 km"], ["Time", "0:34:12"], ["Calories", "340 kcal"], ["Nature match", "92%"]].map(([k, v]) => (
                <div key={k} style={{ background: "#f5f6fb", borderRadius: 13, padding: "11px 6px" }}>
                  <div style={{ fontSize: 11, color: MUTED }}>{k}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: INK }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, background: "linear-gradient(135deg,#7d7ff0,#5653d8)", color: "#fff", fontWeight: 800, fontSize: 15.5, borderRadius: 13, padding: "13px 0" }}>Done — back to map</div>
            <div style={{ ...fadeUp(frame, 200, 18), marginTop: 20, textAlign: "left", background: "#f5f6fb", borderRadius: 15, padding: "12px 14px", fontSize: 14, color: "#4a5170" }}>
              📈 <b style={{ color: INK }}>Week goal:</b> 38.5 / 50 km — recent activity updated
            </div>
          </div>
        </Phone>
      </div>
      <Caption text="Run, finish, repeat — every loop makes the next recommendation smarter." />
    </AbsoluteFill>
  );
};

/* ---------------- Scene 7: Why Meta + closing (160–180s) ---------------- */
const SceneMeta: React.FC = () => {
  const frame = useCurrentFrame();
  const rows = [
    ["Decide", "Mood + time → distance, vibe, and the reason why"],
    ["Explain", "Names and narrates routes from real map facts — never invented streets"],
    ["Refine", "Understands Indonesian + English feedback, re-ranks instantly"],
    ["Guide", "Writes the audio tour you hear as you pass each landmark"],
  ];
  return (
    <AbsoluteFill style={{ background: "linear-gradient(140deg, #171b42, #2a2570 60%, #625fe0)", fontFamily: "Inter, system-ui, sans-serif", color: "#fff" }}>
      <div style={{ position: "absolute", left: 90, top: 92, width: 700 }}>
        <div style={{ ...fadeUp(frame, 5), fontSize: 50, fontWeight: 900, lineHeight: 1.18 }}>Powered by Meta AI.<br />Grounded by real maps.</div>
        <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 13 }}>
          {rows.map(([k, v], i) => (
            <div key={k} style={{ ...fadeUp(frame, 40 + i * 32, 16), display: "flex", gap: 16, alignItems: "baseline" }}>
              <span style={{ background: "rgba(255,255,255,0.16)", borderRadius: 999, padding: "5px 15px", fontSize: 16, fontWeight: 800, minWidth: 108, textAlign: "center" }}>{k}</span>
              <span style={{ fontSize: 21.5, color: "#dfe1ff" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", right: 90, bottom: 110, textAlign: "right", ...fadeUp(frame, 190) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "flex-end" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#8b8cf5,#5653d8)", display: "grid", placeItems: "center", fontSize: 30, fontWeight: 900 }}>R</div>
          <span style={{ fontSize: 27, fontWeight: 800, letterSpacing: 1 }}>RUNOVA</span>
        </div>
        <div style={{ fontSize: 22, color: "#c6c9f5", marginTop: 12 }}>Tell us the distance and the vibe.<br />AI designs the loop.</div>
        <div style={{ fontSize: 17, color: "#9ea3e8", marginTop: 10 }}>akmalzufaaaf.github.io/runova</div>
      </div>
      <Caption text="Runova — AI where judgment is needed, algorithms where truth is needed. Thank you." />
    </AbsoluteFill>
  );
};

const Music: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const volume = Math.min(
    interpolate(frame, [0, 45], [0, 0.55], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    interpolate(frame, [durationInFrames - 110, durationInFrames - 10], [0.55, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  );
  return <Audio src={staticFile("music.mp3")} volume={volume} />;
};

export const RunovaDemo: React.FC = () => {
  const t = (presentation: any) => (
    <TransitionSeries.Transition presentation={presentation} timing={linearTiming({ durationInFrames: 18 })} />
  );
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Music />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={618}><SceneHook /></TransitionSeries.Sequence>
        {t(fade())}
        <TransitionSeries.Sequence durationInFrames={768}><SceneDecide /></TransitionSeries.Sequence>
        {t(slide({ direction: "from-right" }))}
        <TransitionSeries.Sequence durationInFrames={918}><SceneRoutes /></TransitionSeries.Sequence>
        {t(fade())}
        <TransitionSeries.Sequence durationInFrames={768}><SceneRefine /></TransitionSeries.Sequence>
        {t(slide({ direction: "from-left" }))}
        <TransitionSeries.Sequence durationInFrames={1218}><SceneRun /></TransitionSeries.Sequence>
        {t(fade())}
        <TransitionSeries.Sequence durationInFrames={618}><SceneDone /></TransitionSeries.Sequence>
        {t(fade())}
        <TransitionSeries.Sequence durationInFrames={600}><SceneMeta /></TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
