import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
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
const FONT = "Inter, system-ui, sans-serif";

const up = (frame: number, delay: number, dur = 18) => ({
  opacity: interpolate(frame, [delay, delay + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  translate: `0px ${interpolate(frame, [delay, delay + dur], [26, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px`,
});

const Caption: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", left: 90, right: 90, bottom: 30, display: "flex", justifyContent: "center", zIndex: 5 }}>
    <div style={{ background: "rgba(10,14,35,0.88)", color: "#fff", fontSize: 24, lineHeight: 1.45, padding: "13px 24px", borderRadius: 15, textAlign: "center", maxWidth: 1000, fontFamily: FONT }}>{text}</div>
  </div>
);

const Phone: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ width: 295, height: 600, background: "#fff", borderRadius: 42, border: "10px solid #141830", boxShadow: "0 34px 70px rgba(35,35,100,0.28)", overflow: "hidden", position: "relative", fontFamily: FONT }}>
    {children}
  </div>
);

const Chip: React.FC<{ label: string; active?: boolean }> = ({ label, active }) => (
  <span style={{ padding: "8px 13px", borderRadius: 999, fontSize: 14.5, fontWeight: 700, background: active ? "linear-gradient(135deg,#7d7ff0,#5653d8)" : "#eef0fa", color: active ? "#fff" : "#4a5170", border: active ? "none" : "1.5px solid #e7e8f2" }}>{label}</span>
);

const Music: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const volume = Math.min(
    interpolate(frame, [0, 45], [0, 0.34], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    interpolate(frame, [durationInFrames - 100, durationInFrames - 10], [0.34, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  );
  return <Audio src={staticFile("music.mp3")} volume={volume} />;
};

/* ---------- S1 Problem 0:00–0:25 ---------- */
const S1: React.FC = () => {
  const frame = useCurrentFrame();
  const appNames = ["TrailMix Routes", "CityRun Planner", "MapMyLoop", "RouteFinder Go"];
  const activeApp = Math.floor(frame / 55) % appNames.length;
  const hand = interpolate(frame, [0, 740], [0, 300]);
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: FONT }}>
      <div style={{ position: "absolute", left: 92, top: 128, width: 560 }}>
        <div style={{ ...up(frame, 5), fontSize: 56, fontWeight: 900, color: INK, lineHeight: 1.14 }}>Ready to run…<br />but where?</div>
        <div style={{ ...up(frame, 95), marginTop: 30, background: "#fff", borderRadius: 18, padding: "18px 20px", boxShadow: "0 12px 28px rgba(90,90,180,.13)", width: 470 }}>
          <div style={{ fontSize: 23, color: INK }}>"What route should I take today?"</div>
          <div style={{ fontSize: 17, color: MUTED, marginTop: 8 }}>New city. Same old loop. Forty tabs of other people's routes.</div>
        </div>
        <div style={{ ...up(frame, 420), fontSize: 30, fontWeight: 800, color: PURPLE, lineHeight: 1.4, marginTop: 36, width: 520 }}>
          Sometimes, choosing the right route is harder than starting the run.
        </div>
      </div>
      <div style={{ position: "absolute", right: 105, top: 62, ...up(frame, 25) }}>
        <Phone>
          <div style={{ padding: "22px 18px", background: "#f7f8fc", height: "100%" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: INK, marginBottom: 12 }}>Find a route…</div>
            {appNames.map((n, i) => (
              <div key={n} style={{ background: i === activeApp ? "#eceaff" : "#fff", border: i === activeApp ? `2px solid ${PURPLE}` : "2px solid transparent", borderRadius: 15, padding: "13px 14px", marginBottom: 10, boxShadow: "0 7px 16px rgba(90,90,180,.09)" }}>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: INK }}>{["🗺️", "🏃", "📍", "🧭"][i]} {n}</div>
                <div style={{ fontSize: 12.5, color: MUTED, marginTop: 3 }}>{["Too far away…", "12 km — too long", "Starts across town", "Dead end at a highway"][i]}</div>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
              <svg width="62" height="62" viewBox="0 0 62 62">
                <circle cx="31" cy="31" r="27" fill="#fff" stroke="#dfe3f2" strokeWidth="4" />
                <line x1="31" y1="31" x2="31" y2="14" stroke={PURPLE} strokeWidth="4.5" strokeLinecap="round" transform={`rotate(${hand} 31 31)`} />
                <circle cx="31" cy="31" r="4" fill={INK} />
              </svg>
              <div>
                <div style={{ fontSize: 19, fontWeight: 800, color: INK }}>{Math.floor(frame / 55) + 3} minutes gone…</div>
                <div style={{ fontSize: 13.5, color: MUTED }}>still not running 😩</div>
              </div>
            </div>
          </div>
        </Phone>
      </div>
      <Caption text="Choosing a route shouldn't be the hardest part of your run." />
    </AbsoluteFill>
  );
};

/* ---------- S2 Introducing Runova 0:25–0:45 ---------- */
const S2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 13 } });
  return (
    <AbsoluteFill style={{ background: "linear-gradient(140deg,#8b8cf5,#625fe0 55%,#4542c4)", fontFamily: FONT, color: "#fff" }}>
      <Audio src={staticFile("vo/scene2.wav")} volume={0.95} />
      <div style={{ position: "absolute", left: 110, top: 120, width: 520 }}>
        <div style={{ scale: `${0.6 + pop * 0.4}`, opacity: pop }}>
          <Img src={staticFile("logo-icon.png")} style={{ width: 128, height: 128, borderRadius: 30, boxShadow: "0 22px 44px rgba(20,16,80,.4)" }} />
        </div>
        <div style={{ ...up(frame, 22), fontSize: 66, fontWeight: 900, letterSpacing: 2, marginTop: 26 }}>RUNOVA</div>
        <div style={{ ...up(frame, 38), fontSize: 29, color: "#dfe1ff", marginTop: 8 }}>"Your run. Your mood. Your rhythm."</div>
        <div style={{ ...up(frame, 90), fontSize: 21, color: "#c6c9f5", lineHeight: 1.55, marginTop: 28, width: 470 }}>
          An AI-powered running companion that understands how you feel — and turns it into a run designed for you.
        </div>
      </div>
      <div style={{ position: "absolute", right: 110, top: 62, ...up(frame, 55) }}>
        <Phone>
          <div style={{ padding: "24px 19px", background: "#f7f8fc", height: "100%" }}>
            <div style={{ background: "#fff", borderRadius: 20, padding: 17, boxShadow: "0 10px 24px rgba(90,90,180,.1)" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: INK }}>Hi, how's your day today?</div>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>Tell me how you feel — I'll decide everything else.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                <Chip label="😩 Stressed" />
                <Chip label="🪫 Tired" />
                <Chip label="✨ Fresh" active />
                <Chip label="🔥 Energetic" />
              </div>
              <div style={{ marginTop: 18, background: "linear-gradient(135deg,#7d7ff0,#5653d8)", color: "#fff", textAlign: "center", fontWeight: 800, fontSize: 16, borderRadius: 14, padding: "13px 0" }}>Let's Run →</div>
            </div>
          </div>
        </Phone>
      </div>
      <Caption text="Meet Runova — the AI that decides the track, so you can just run." />
    </AbsoluteFill>
  );
};

/* ---------- S3 Core AI experience 0:45–1:20 ---------- */
const S3: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = "I'm stressed, and I have 40 minutes.";
  const chars = Math.floor(interpolate(frame, [50, 210], [0, typed.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const insights = [
    ["😩 Mood", "Stressed", 260],
    ["⏱️ Time", "40 minutes", 310],
    ["🎯 Need", "Steady stress reset", 360],
  ] as const;
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: FONT }}>
      <Audio src={staticFile("vo/scene3.wav")} volume={0.95} />
      <div style={{ position: "absolute", left: 92, top: 110, width: 520 }}>
        <div style={{ ...up(frame, 5), fontSize: 50, fontWeight: 900, color: INK, lineHeight: 1.16 }}>Just say<br />how you feel.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 34, width: 430 }}>
          {insights.map(([k, v, d]) => (
            <div key={k} style={{ ...up(frame, d, 15), background: "#fff", borderRadius: 15, padding: "12px 16px", display: "flex", justifyContent: "space-between", boxShadow: "0 9px 20px rgba(90,90,180,.1)", fontSize: 17 }}>
              <span style={{ color: MUTED, fontWeight: 700 }}>{k}</span><b style={{ color: PURPLE }}>{v}</b>
            </div>
          ))}
        </div>
        <div style={{ ...up(frame, 450), marginTop: 26, width: 450, fontSize: 21, color: "#4a5170", lineHeight: 1.55 }}>
          Muse Spark reasons about the <b>meaning</b> — not keywords — and designs the run around it.
        </div>
      </div>
      <div style={{ position: "absolute", right: 105, top: 62, ...up(frame, 25) }}>
        <Phone>
          <div style={{ padding: "22px 18px", background: "#f7f8fc", height: "100%" }}>
            <div style={{ fontSize: 16.5, fontWeight: 800, color: INK }}>How are you feeling today?</div>
            <div style={{ marginTop: 13, background: "#eceaff", borderRadius: "16px 16px 16px 5px", padding: "12px 14px", fontSize: 15, color: INK, minHeight: 66 }}>
              {typed.slice(0, chars)}<span style={{ opacity: frame % 30 < 16 ? 1 : 0 }}>|</span>
            </div>
            <div style={{ ...up(frame, 240, 15), marginTop: 13, display: "flex", alignItems: "center", gap: 9, color: MUTED, fontSize: 13.5 }}>
              <span style={{ width: 15, height: 15, borderRadius: "50%", border: `3px solid ${PURPLE}`, borderTopColor: "transparent", display: "inline-block", rotate: `${frame * 12}deg` }} />
              AI is designing your run…
            </div>
            <div style={{ ...up(frame, 430, 18), marginTop: 14, background: "#fff", borderRadius: 17, padding: 15, border: `2.5px solid ${PURPLE}`, boxShadow: "0 12px 26px rgba(98,95,224,.2)" }}>
              <div style={{ fontSize: 15.5, color: INK, lineHeight: 1.5 }}>"Let's turn that stress into a <b>steady, refreshing run</b>."</div>
              <div style={{ borderTop: "1px solid #e7e8f2", marginTop: 11, paddingTop: 11 }}>
                <div style={{ fontSize: 12, color: PURPLE, fontWeight: 800 }}>⭐ AI PICK</div>
                <div style={{ fontSize: 16.5, fontWeight: 800, color: INK, marginTop: 3 }}>Embung Tambakboyo Loop</div>
                <div style={{ fontSize: 13.5, color: MUTED, marginTop: 4 }}>5.5 km · Nature · steady pace · stress reset · loop back home</div>
              </div>
            </div>
          </div>
        </Phone>
      </div>
      <Caption text="Instead of searching, just tell Runova how you feel. It decides the rest." />
    </AbsoluteFill>
  );
};

/* ---------- S4 Running experience 1:20–1:55 ---------- */
const S4: React.FC = () => {
  const frame = useCurrentFrame();
  const runX = interpolate(frame, [40, 1000], [-80, 1150], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bob = Math.sin(frame / 4.2) * 9;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#bfe0ff 0%,#eaf6ff 55%,#e6f4e3 100%)", fontFamily: FONT, overflow: "hidden" }}>
      <Audio src={staticFile("vo/scene4.wav")} volume={0.95} />
      <div style={{ position: "absolute", right: 130, top: 70, width: 105, height: 105, borderRadius: "50%", background: "#ffd94d", boxShadow: "0 0 70px rgba(255,205,60,.75)" }} />
      {[[90, 330, 74], [220, 360, 92], [1010, 345, 84], [1130, 370, 66]].map(([x, y, r], i) => (
        <div key={i}>
          <div style={{ position: "absolute", left: x, top: y, width: r, height: r, borderRadius: "50%", background: "#69b96f" }} />
          <div style={{ position: "absolute", left: x + r / 2 - 6, top: y + r - 8, width: 12, height: 58, background: "#8a6844", borderRadius: 6 }} />
        </div>
      ))}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 92, height: 110, background: "#d8c49a", borderRadius: "50% 50% 0 0 / 32px" }} />
      <div style={{ position: "absolute", left: runX, bottom: 178 + bob }}>
        <div style={{ width: 118, height: 118, borderRadius: "50%", overflow: "hidden", boxShadow: "0 20px 38px rgba(60,50,160,.35)" }}>
          <Img src={staticFile("logo-icon.png")} style={{ width: 118, height: 118, objectFit: "cover" }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 92, top: 92, width: 610 }}>
        <div style={{ ...up(frame, 5), fontSize: 52, fontWeight: 900, color: INK, lineHeight: 1.16 }}>Your run,<br />in your rhythm.</div>
        <div style={{ display: "flex", gap: 10, marginTop: 30 }}>
          {[["Your Run", "Embung Loop"], ["⏱️ Time", "40 minutes"], ["🏃 Pace", "Steady"], ["🌿 Goal", "Stress reset"]].map(([k, v], i) => (
            <div key={k} style={{ ...up(frame, 120 + i * 45, 15), background: "rgba(255,255,255,.94)", borderRadius: 15, padding: "12px 15px", boxShadow: "0 10px 22px rgba(70,90,140,.14)" }}>
              <div style={{ fontSize: 12.5, color: MUTED, fontWeight: 700 }}>{k}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: INK }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "flex-end", height: 66, marginTop: 42 }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} style={{ width: 11, borderRadius: 6, background: PURPLE, opacity: 0.35 + 0.65 * Math.abs(Math.sin(i / 2.4)), height: 14 + Math.abs(Math.sin(frame / 6 + i / 1.7)) * 50 }} />
          ))}
        </div>
      </div>
      <Caption text="Every run feels intentional — the rhythm follows you, not the other way around." />
    </AbsoluteFill>
  );
};

/* ---------- S5 AI difference 1:55–2:25 ---------- */
const S5: React.FC = () => {
  const frame = useCurrentFrame();
  const rows: Array<[string, string[], string[]]> = [[
    "Traditional route apps",
    ["🔍 Search routes", "📜 Browse other people's loops", "🤔 Pick one & hope it fits", "🚧 Dead ends, wrong distances"],
    [],
  ]];
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: FONT }}>
      <Audio src={staticFile("vo/scene5.wav")} volume={0.95} />
      <div style={{ ...up(frame, 5), textAlign: "center", marginTop: 56 }}>
        <span style={{ fontSize: 44, fontWeight: 900, color: INK }}>Old way vs. </span>
        <span style={{ fontSize: 44, fontWeight: 900, color: PURPLE }}>Runova</span>
      </div>
      <div style={{ display: "flex", gap: 22, justifyContent: "center", marginTop: 34 }}>
        <div style={{ ...up(frame, 40), width: 480, background: "#eceef4", borderRadius: 22, padding: "22px 24px" }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: "#6b7194" }}>{rows[0][0]}</div>
          {rows[0][1].map((t, i) => (
            <div key={t} style={{ ...up(frame, 90 + i * 45, 13), fontSize: 19, color: "#6b7194", marginTop: 15, display: "flex", justifyContent: "space-between" }}>
              <span>{t}</span><span>✕</span>
            </div>
          ))}
        </div>
        <div style={{ ...up(frame, 70), width: 480, background: "#fff", borderRadius: 22, padding: "22px 24px", border: `3px solid ${PURPLE}`, boxShadow: "0 18px 38px rgba(98,95,224,.22)" }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: PURPLE }}>Runova</div>
          {[["💬", "Tell us how you feel"], ["🧠", "AI understands your needs"], ["🗺️", "Get a loop designed for you"], ["🔁", "Always ends back home"]].map(([ic, t], i) => (
            <div key={t} style={{ ...up(frame, 120 + i * 45, 13), fontSize: 19, color: INK, marginTop: 15, display: "flex", gap: 11 }}>
              <span>{ic}</span><span style={{ fontWeight: 650 }}>{t}</span><span style={{ marginLeft: "auto", color: PURPLE }}>✓</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...up(frame, 430), margin: "30px auto 0", width: 760, background: "#0e1330", color: "#fff", borderRadius: 17, padding: "16px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 18.5 }}>"I have 20 minutes and want something energizing."</span>
        <span style={{ fontSize: 16.5, color: "#aeb3ff", fontWeight: 700 }}>→ 3.5K Urban Energy loop ⚡</span>
      </div>
      <Caption text="Runova doesn't ask where you want to go. It understands what run you need." />
    </AbsoluteFill>
  );
};

/* ---------- S6 Emotional payoff 2:25–2:45 ---------- */
const S6: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#ffd9a0 0%,#ffe9c9 52%,#dff2df 100%)", fontFamily: FONT, overflow: "hidden" }}>
      <Audio src={staticFile("vo/scene6.wav")} volume={0.95} />
      <div style={{ position: "absolute", left: 130, top: 76, width: 130, height: 130, borderRadius: "50%", background: "#ffbe3d", boxShadow: "0 0 90px rgba(255,170,40,.8)" }} />
      <div style={{ position: "absolute", left: 92, top: 128, width: 580 }}>
        <div style={{ ...up(frame, 5), fontSize: 52, fontWeight: 900, color: INK, lineHeight: 1.18 }}>The best finish line?<br />Your own front door.</div>
        <div style={{ ...up(frame, 40), fontSize: 24, color: "#5a5142", lineHeight: 1.6, marginTop: 24, width: 500 }}>
          Relaxed. Energized. Satisfied. The loop ends exactly where you started — right on time.
        </div>
      </div>
      <div style={{ position: "absolute", right: 105, top: 62, ...up(frame, 30) }}>
        <Phone>
          <div style={{ padding: "26px 20px", background: "#fff", height: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 46, marginTop: 18 }}>🎉</div>
            <div style={{ fontSize: 23, fontWeight: 900, color: INK }}>Loop complete!</div>
            <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.55 }}>Embung Tambakboyo Loop — and you're back home.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["Distance", "5.48 km"], ["Time", "38:20"], ["Mood after", "Refreshed 🌿"], ["Nature", "92%"]].map(([k, v]) => (
                <div key={k} style={{ background: "#f5f6fb", borderRadius: 12, padding: "10px 5px" }}>
                  <div style={{ fontSize: 10.5, color: MUTED }}>{k}</div>
                  <div style={{ fontSize: 15.5, fontWeight: 800, color: INK }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ ...up(frame, 210, 16), marginTop: 18, background: "linear-gradient(135deg,#7d7ff0,#5653d8)", color: "#fff", borderRadius: 14, padding: "14px 10px", fontSize: 16.5, fontWeight: 800 }}>
              Every run starts with you.
            </div>
          </div>
        </Phone>
      </div>
      <Caption text="Sometimes the best run is measured by how you feel when you finish." />
    </AbsoluteFill>
  );
};

/* ---------- S7 Final brand moment 2:45–3:00 ---------- */
const S7: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 8, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ background: "linear-gradient(140deg,#8b8cf5,#625fe0 55%,#4542c4)", fontFamily: FONT, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ scale: `${0.55 + pop * 0.45}`, opacity: pop }}>
        <Img src={staticFile("logo-icon.png")} style={{ width: 148, height: 148, borderRadius: 34, boxShadow: "0 26px 54px rgba(20,16,80,.45)" }} />
      </div>
      <div style={{ ...up(frame, 30), fontSize: 72, fontWeight: 900, letterSpacing: 3, marginTop: 30 }}>RUNOVA</div>
      <div style={{ ...up(frame, 52), fontSize: 29, color: "#dfe1ff" }}>"Your run. Your mood. Your rhythm."</div>
      <div style={{ ...up(frame, 120), fontSize: 25, fontWeight: 800, marginTop: 42, background: "rgba(255,255,255,.16)", padding: "13px 28px", borderRadius: 999 }}>
        Let AI find your rhythm.
      </div>
      <div style={{ ...up(frame, 150), fontSize: 16.5, color: "#b9bcf2", marginTop: 22 }}>akmalzufaaaf.github.io/runova</div>
    </AbsoluteFill>
  );
};

export const RunovaLaunch: React.FC = () => {
  const t = (p: any) => <TransitionSeries.Transition presentation={p} timing={linearTiming({ durationInFrames: 18 })} />;
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Music />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={768}><S1 /></TransitionSeries.Sequence>
        {t(fade())}
        <TransitionSeries.Sequence durationInFrames={618}><S2 /></TransitionSeries.Sequence>
        {t(slide({ direction: "from-right" }))}
        <TransitionSeries.Sequence durationInFrames={1068}><S3 /></TransitionSeries.Sequence>
        {t(fade())}
        <TransitionSeries.Sequence durationInFrames={1068}><S4 /></TransitionSeries.Sequence>
        {t(slide({ direction: "from-left" }))}
        <TransitionSeries.Sequence durationInFrames={918}><S5 /></TransitionSeries.Sequence>
        {t(fade())}
        <TransitionSeries.Sequence durationInFrames={618}><S6 /></TransitionSeries.Sequence>
        {t(fade())}
        <TransitionSeries.Sequence durationInFrames={450}><S7 /></TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
