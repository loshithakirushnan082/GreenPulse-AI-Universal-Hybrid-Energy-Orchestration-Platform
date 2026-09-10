import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from "recharts";

// ─────────────────────── COLORS ──────────────────────────────
const C = {
  navy:"#0F172A", navy2:"#15203A",
  green:"#16A34A", greenSoft:"#4ADE80",
  blue:"#2563EB", cyan:"#38BDF8",
  orange:"#F97316", yellow:"#FACC15",
  purple:"#A855F7", red:"#EF4444",
  white:"#FFFFFF",
  card:"rgba(255,255,255,0.05)",
  border:"rgba(255,255,255,0.09)",
  t1:"#F8FAFC", t2:"#94A3B8", t3:"#64748B", t4:"#334155"
};

// ─────────────────────── SOURCE CONFIG ───────────────────────
const SOURCES = {
  solar:     { label:"Solar",      icon:"☀️",  color:C.orange  },
  wind:      { label:"Wind",       icon:"🌬️",  color:C.cyan    },
  human:     { label:"Human",      icon:"🚶",  color:C.green   },
  transport: { label:"Transport",  icon:"🚆",  color:C.blue    },
  industrial:{ label:"Industrial", icon:"🏭",  color:C.purple  },
};

// ─────────────────────── ENERGY GUIDE DATA ───────────────────
const GUIDE = [
  { icon:"🧍", cat:"Human Body", color:C.green, items:[
    { name:"Footsteps / Walking", tech:"Piezoelectric (PZT)", tool:"PZT Tiles + Rectifier", hw:"~0.5 mW/step" },
    { name:"Body Heat",           tech:"Thermoelectric (TEG)", tool:"Bi2Te3 Module + Heat Sink", hw:"~5 mW" },
    { name:"Arm Swing",           tech:"Electromagnetic Induction", tool:"Coil + Neodymium Magnet", hw:"~2 mW" },
    { name:"Keyboard Typing",     tech:"Piezoelectric",       tool:"Micro PZT under keys", hw:"~0.1 mW" },
    { name:"Breathing Motion",    tech:"PVDF Piezo Film",     tool:"PVDF Belt around chest", hw:"~1 mW" },
  ]},
  { icon:"🏛", cat:"Public Places", color:C.blue, items:[
    { name:"Railway Station Floor", tech:"Piezoelectric Array",  tool:"Pavegen-style tiles", hw:"~3 W per 100 people" },
    { name:"Mall / Airport Entry",  tech:"Piezo + TENG Hybrid", tool:"Layered mat system",  hw:"~5 W" },
    { name:"Stadium Crowd",         tech:"EM Floor Generator",   tool:"Spring-mounted panels", hw:"~50 W" },
    { name:"Temple Footfall",       tech:"Piezo Tile Grid",      tool:"Weatherproof tile network", hw:"~8 W" },
  ]},
  { icon:"🚆", cat:"Transportation", color:C.orange, items:[
    { name:"Speed Breaker",         tech:"Hydraulic + EM",       tool:"Hydraulic Generator", hw:"~100 W per vehicle" },
    { name:"Railway Track Vibration",tech:"EM Vibration Harvester",tool:"Rail Clamp Harvester", hw:"~20 W per train" },
    { name:"Vehicle Exhaust Heat",  tech:"TEG",                  tool:"High-Temp TEG Module", hw:"~30 W" },
    { name:"Regenerative Braking",  tech:"Electromagnetic",      tool:"Motor-Generator + VFD", hw:"~500 W" },
  ]},
  { icon:"🌿", cat:"Nature & Environment", color:C.cyan, items:[
    { name:"Solar Energy",          tech:"Photovoltaic (PV)",    tool:"PV Panel + MPPT Controller", hw:"100–300 W" },
    { name:"Wind Energy",           tech:"Electromagnetic",      tool:"Wind Turbine + Rectifier", hw:"50–500 W" },
    { name:"Rain Energy",           tech:"TENG Membrane",        tool:"PTFE film + Electrode", hw:"~1 mW per drop" },
    { name:"River / Water Flow",    tech:"Micro Hydro Turbine",  tool:"Kaplan / Pelton Turbine", hw:"10–100 W" },
  ]},
  { icon:"🏭", cat:"Industrial / Factory", color:C.purple, items:[
    { name:"Machine Vibration",     tech:"EM / Piezo Harvester", tool:"Clamp-on Harvester", hw:"~25 mW" },
    { name:"Waste Heat Cascade",    tech:"Multi-stage TEG",      tool:"High+Medium TEG Array", hw:"~50 W" },
    { name:"Conveyor Belt Motion",  tech:"Roller EM Generator",  tool:"Pinch Roller + Generator", hw:"~10 W" },
    { name:"Compressed Air",        tech:"Micro Air Turbine",    tool:"Nozzle Turbine", hw:"~5 W" },
  ]},
  { icon:"🏠", cat:"Everyday Objects", color:C.red, items:[
    { name:"Door Hinge",            tech:"EM Rotary Generator",  tool:"Hinge-coupled Generator", hw:"~0.2 mW" },
    { name:"Water Pipe Vibration",  tech:"Piezo Clamp",          tool:"Clamp-on PZT Transducer", hw:"~1 mW" },
    { name:"Elevator / Lift",       tech:"Regenerative Drive",   tool:"VFD with Regen Mode", hw:"~300 W" },
    { name:"Window Glass Vibration",tech:"PVDF Film",            tool:"PVDF film on glass", hw:"~0.5 mW" },
  ]},
];

// ─────────────────────── HELPERS ─────────────────────────────
const rw = (v, mn, mx, vol) =>
  Math.max(mn, Math.min(mx, v + (Math.random() - 0.5) * vol));

const seedHistory = () =>
  Array.from({ length: 24 }, (_, i) => ({
    label: `${i}h`,
    solar:      Math.round(15 + Math.random() * 70),
    wind:       Math.round(8  + Math.random() * 35),
    human:      Math.round(2  + Math.random() * 8),
    transport:  Math.round(1  + Math.random() * 6),
    industrial: Math.round(3  + Math.random() * 12),
  }));

const defaultState = () => ({
  soc: 68, co2Saved: 4.7,
  rates: { solar:42, wind:18, human:4, transport:3, industrial:6 },
  todayTotals: { solar:1840, wind:760, human:95, transport:64, industrial:210 },
  history: seedHistory(),
  lastUpdated: Date.now(),
});

// localStorage helpers (replaces window.storage for local build)
const save = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};
const load = (key) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
  catch { return null; }
};

// ─────────────────────── UI ATOMS ────────────────────────────
const Glass = ({ children, style = {} }) => (
  <div style={{
    background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 18, backdropFilter: "blur(10px)", ...style
  }}>
    {children}
  </div>
);

const NavBtn = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} style={{
    flex: 1, background: "none", border: "none",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
    padding: "8px 0", cursor: "pointer",
    color: active ? C.green : C.t3, transition: "color .2s"
  }}>
    <span style={{ fontSize: 21 }}>{icon}</span>
    <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>{label}</span>
  </button>
);

// ══════════════════════════════════════════════════════════════
//  SCREEN 1 — DASHBOARD
// ══════════════════════════════════════════════════════════════
function Dashboard({ state }) {
  if (!state) return (
    <div style={{ color: C.t2, textAlign: "center", padding: 60, fontSize: 14 }}>
      Loading GreenPulse AI…
    </div>
  );

  const total = Object.values(state.rates).reduce((a, b) => a + b, 0);
  const { soc } = state;
  const socColor = soc > 50 ? C.green : soc > 25 ? C.orange : C.red;
  const r = 58, circ = 2 * Math.PI * r;

  const topSource = Object.entries(state.rates).sort((a, b) => b[1] - a[1])[0];
  const rec = soc < 25
    ? "⚠️ Battery critical — conserving energy for essential loads only."
    : state.rates.solar > 70
    ? "☀️ Peak solar output — routing surplus to supercapacitor bank."
    : state.rates.wind > 35
    ? "🌬️ Strong wind detected — ideal window for high-load operations."
    : "✅ All sources balanced. Orchestration running at optimal efficiency.";

  return (
    <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>GreenPulse AI</div>
          <div style={{ fontSize: 11, color: C.t3 }}>Universal Hybrid Energy Orchestration</div>
        </div>
        <div style={{
          background: "#16A34A22", padding: "4px 12px", borderRadius: 20,
          fontSize: 11, color: C.greenSoft, fontWeight: 600
        }}>● LIVE</div>
      </div>

      {/* Battery + Total */}
      <div style={{ display: "flex", gap: 12 }}>
        <Glass style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ position: "relative", width: 136, height: 136 }}>
            <svg width="136" height="136" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="68" cy="68" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={12} />
              <circle cx="68" cy="68" r={r} fill="none" stroke={socColor} strokeWidth={12}
                strokeDasharray={circ}
                strokeDashoffset={circ - (soc / 100) * circ}
                strokeLinecap="round"
                style={{ transition: "all 0.8s ease" }} />
            </svg>
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
            }}>
              <span style={{ fontSize: 10, color: C.t2 }}>Battery SOC</span>
              <span style={{ fontSize: 28, fontWeight: 800, color: socColor, lineHeight: 1 }}>
                {Math.round(soc)}%
              </span>
              <span style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>
                {soc > 50 ? "Charging ↑" : "Discharging ↓"}
              </span>
            </div>
          </div>
        </Glass>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <Glass style={{ padding: 14, background: "linear-gradient(135deg,#16A34A18,#38BDF810)" }}>
            <div style={{ fontSize: 10, color: C.t2, marginBottom: 3 }}>Total Generating Now</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: C.t1, lineHeight: 1 }}>
              {total}<span style={{ fontSize: 13, color: C.t2, marginLeft: 4 }}>W</span>
            </div>
            <div style={{ fontSize: 10, color: C.t3, marginTop: 5 }}>
              {(Object.values(state.todayTotals).reduce((a, b) => a + b, 0) / 1000).toFixed(2)} kWh today
              &nbsp;·&nbsp;{state.co2Saved} kg CO₂ saved
            </div>
          </Glass>
          <Glass style={{ padding: 12, display: "flex", gap: 8 }}>
            <span style={{ fontSize: 16, marginTop: 1 }}>🤖</span>
            <div>
              <div style={{ fontSize: 10, color: C.cyan, fontWeight: 700, marginBottom: 2 }}>
                AI Recommendation
              </div>
              <div style={{ fontSize: 11, color: C.t2, lineHeight: 1.4 }}>{rec}</div>
            </div>
          </Glass>
        </div>
      </div>

      {/* Source cards */}
      <div>
        <div style={{ fontSize: 11, color: C.t2, fontWeight: 600, marginBottom: 8 }}>
          LIVE ENERGY SOURCES
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(SOURCES).map(([id, meta]) => (
            <Glass key={id} style={{ padding: "12px 14px", flex: "1 1 75px" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{meta.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.t1, lineHeight: 1 }}>
                {state.rates[id]}
              </div>
              <div style={{ fontSize: 9, color: C.t3, marginBottom: 6 }}>W · {meta.label}</div>
              <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.07)" }}>
                <div style={{
                  height: "100%", borderRadius: 2, background: meta.color,
                  width: `${Math.min(100, (state.rates[id] / 100) * 100)}%`,
                  transition: "width 0.6s ease"
                }} />
              </div>
            </Glass>
          ))}
        </div>
      </div>

      {/* Mini trend chart */}
      <Glass style={{ padding: "14px 8px 4px" }}>
        <div style={{ fontSize: 11, color: C.t2, fontWeight: 600, marginBottom: 8, paddingLeft: 8 }}>
          24h Generation Trend
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={state.history}>
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.orange} stopOpacity={0.5} />
                <stop offset="100%" stopColor={C.orange} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.cyan} stopOpacity={0.4} />
                <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fill: C.t3, fontSize: 9 }} axisLine={false} tickLine={false} interval={5} />
            <Tooltip contentStyle={{ background: C.navy2, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 11 }} />
            <Area type="monotone" dataKey="solar" stroke={C.orange} fill="url(#sg)" strokeWidth={2} name="Solar (W)" />
            <Area type="monotone" dataKey="wind"  stroke={C.cyan}   fill="url(#wg)" strokeWidth={2} name="Wind (W)"  />
          </AreaChart>
        </ResponsiveContainer>
      </Glass>

      {/* Bottom stat pills */}
      <div style={{ display: "flex", gap: 10 }}>
        {[
          { label: "CO₂ Saved", value: `${state.co2Saved} kg`, color: C.greenSoft },
          { label: "Top Source", value: SOURCES[topSource[0]].label, color: C.cyan },
          { label: "Backup Est.", value: `${Math.round(soc * 0.6)} min`, color: soc > 30 ? C.green : C.red },
        ].map(s => (
          <Glass key={s.label} style={{ flex: 1, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, color: C.t3, marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
          </Glass>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  SCREEN 2 — DETECT ENERGY (Phone Sensors)
// ══════════════════════════════════════════════════════════════
function DetectEnergy() {
  const [detecting, setDetecting]     = useState(false);
  const [soundLevel, setSoundLevel]   = useState(0);
  const [steps, setSteps]             = useState(0);
  const [location, setLocation]       = useState(null);
  const [lightLevel, setLightLevel]   = useState(null);
  const [detectedSrc, setDetectedSrc] = useState([]);
  const [bars, setBars]               = useState(Array(20).fill(4));

  const streamRef  = useRef(null);
  const animRef    = useRef(null);
  const lastMag    = useRef(0);
  const motionRef  = useRef(null);
  const lightRef   = useRef(null);

  const stop = useCallback(() => {
    setDetecting(false);
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    window.removeEventListener("devicemotion", motionRef.current);
    lightRef.current?.stop?.();
  }, []);

  const start = useCallback(async () => {
    setDetecting(true);
    setSteps(0);
    setSoundLevel(0);
    setDetectedSrc([]);
    const found = [];

    // ── MIC / SOUND ──────────────────────────────────────
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const ctx      = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setSoundLevel(Math.round(avg));
        setBars(Array.from({ length: 20 }, (_, i) =>
          Math.max(4, (data[i] || 0) / 4 + Math.random() * 8)
        ));
        animRef.current = requestAnimationFrame(tick);
      };
      tick();
      found.push({ icon: "🎙️", label: "Microphone — Sound/Vibration Energy", mw: "8–15", ok: true });
    } catch {
      found.push({ icon: "🎙️", label: "Microphone (permission denied)", mw: "0", ok: false });
    }

    // ── ACCELEROMETER / STEPS ────────────────────────────
    if (typeof DeviceMotionEvent !== "undefined") {
      const handler = (e) => {
        const a = e.acceleration;
        if (!a) return;
        const mag = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
        if (mag - lastMag.current > 9) setSteps(s => s + 1);
        lastMag.current = mag;
      };
      motionRef.current = handler;
      // iOS 13+ needs permission
      if (typeof DeviceMotionEvent.requestPermission === "function") {
        try {
          const perm = await DeviceMotionEvent.requestPermission();
          if (perm === "granted") window.addEventListener("devicemotion", handler);
        } catch {}
      } else {
        window.addEventListener("devicemotion", handler);
      }
      found.push({ icon: "👣", label: "Accelerometer — Step / Motion Energy", mw: "2–5", ok: true });
    }

    // ── GPS LOCATION ─────────────────────────────────────
    navigator.geolocation?.getCurrentPosition(pos => {
      setLocation({ lat: pos.coords.latitude.toFixed(4), lon: pos.coords.longitude.toFixed(4) });
    });
    found.push({ icon: "📍", label: "GPS — Location-based Source Detection", mw: "varies", ok: true });

    // ── LIGHT SENSOR ─────────────────────────────────────
    try {
      const sensor = new AmbientLightSensor();
      lightRef.current = sensor;
      sensor.addEventListener("reading", () => setLightLevel(Math.round(sensor.illuminance)));
      sensor.start();
      found.push({ icon: "☀️", label: "Ambient Light — Solar Potential", mw: "varies", ok: true });
    } catch {
      found.push({ icon: "☀️", label: "Light Sensor (not available on this device)", mw: "—", ok: false });
    }

    setDetectedSrc(found);
  }, []);

  const soundMW   = (soundLevel / 255 * 15).toFixed(1);
  const stepMW    = (steps * 0.5).toFixed(1);
  const solarW    = lightLevel ? (lightLevel / 100000 * 150).toFixed(0) : null;
  const totalEst  = (+soundMW + +stepMW + (solarW ? +solarW : 0)).toFixed(1);

  return (
    <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.t1 }}>🎯 Detect My Energy</div>
        <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>
          Phone sensors மூலம் உன்னை சுற்றி இருக்கும் energy sources automatically detect ஆகும்
        </div>
      </div>

      {/* Big pulse button */}
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <button
          onClick={detecting ? stop : start}
          style={{
            width: 140, height: 140, borderRadius: "50%", border: "none", cursor: "pointer",
            background: detecting
              ? `radial-gradient(circle, ${C.red}22, ${C.red}44)`
              : `radial-gradient(circle, ${C.green}22, ${C.green}44)`,
            boxShadow: detecting
              ? `0 0 50px ${C.red}66`
              : `0 0 40px ${C.green}44`,
            color: detecting ? C.red : C.green,
            fontSize: 18, fontWeight: 700, lineHeight: 1.4,
            animation: detecting ? "gp-pulse 1.5s infinite" : "none",
            transition: "all 0.3s"
          }}
        >
          <div style={{ fontSize: 38 }}>{detecting ? "⏹" : "⚡"}</div>
          <div>{detecting ? "STOP" : "DETECT"}</div>
        </button>
        <style>{`
          @keyframes gp-pulse {
            0%, 100% { box-shadow: 0 0 40px ${C.green}44; }
            50%       { box-shadow: 0 0 80px ${C.green}99; }
          }
        `}</style>
      </div>

      {/* Sound visualiser */}
      {detecting && (
        <Glass style={{ padding: 14 }}>
          <div style={{ fontSize: 11, color: C.cyan, fontWeight: 700, marginBottom: 8 }}>
            🎙️ Sound / Vibration Level
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.07)", borderRadius: 4, marginBottom: 6 }}>
            <div style={{
              height: "100%", borderRadius: 4,
              background: `linear-gradient(90deg,${C.green},${C.cyan})`,
              width: `${(soundLevel / 255) * 100}%`, transition: "width 0.08s"
            }} />
          </div>
          <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 36, marginBottom: 6 }}>
            {bars.map((h, i) => (
              <div key={i} style={{
                flex: 1, borderRadius: 2,
                background: i < (soundLevel / 255) * 20 ? C.cyan : "rgba(255,255,255,0.08)",
                height: `${Math.min(36, h)}px`, transition: "height 0.1s"
              }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.t2 }}>
            <span>Raw level: {soundLevel}/255</span>
            <span style={{ color: C.cyan, fontWeight: 700 }}>~{soundMW} mW harvestable</span>
          </div>
        </Glass>
      )}

      {/* Sensor readings row */}
      {detecting && (
        <div style={{ display: "flex", gap: 10 }}>
          <Glass style={{ flex: 1, padding: 12 }}>
            <div style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>👣 Steps</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.t1, margin: "4px 0" }}>{steps}</div>
            <div style={{ fontSize: 10, color: C.t3 }}>{stepMW} mW piezo est.</div>
          </Glass>
          {location && (
            <Glass style={{ flex: 2, padding: 12 }}>
              <div style={{ fontSize: 11, color: C.orange, fontWeight: 600 }}>📍 GPS Location</div>
              <div style={{ fontSize: 11, color: C.t1, margin: "4px 0" }}>
                {location.lat}, {location.lon}
              </div>
              <div style={{ fontSize: 10, color: C.t3 }}>Analysing nearby sources…</div>
            </Glass>
          )}
          {lightLevel && (
            <Glass style={{ flex: 1, padding: 12 }}>
              <div style={{ fontSize: 11, color: C.yellow, fontWeight: 600 }}>☀️ Light</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.t1, margin: "4px 0" }}>{lightLevel}</div>
              <div style={{ fontSize: 10, color: C.t3 }}>lux · ~{solarW}W solar</div>
            </Glass>
          )}
        </div>
      )}

      {/* Total estimate */}
      {detecting && (
        <Glass style={{
          padding: 16,
          background: "linear-gradient(135deg,#16A34A18,#2563EB10)",
          border: `1px solid ${C.green}44`
        }}>
          <div style={{ fontSize: 10, color: C.t2, marginBottom: 4 }}>
            TOTAL HARVESTABLE ENERGY — REAL-TIME ESTIMATE
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, color: C.green, lineHeight: 1 }}>
            {totalEst} <span style={{ fontSize: 16, color: C.t2 }}>mW</span>
          </div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>
            Sound + Footstep + Solar potential combined
          </div>
        </Glass>
      )}

      {/* Detected sources list */}
      {detectedSrc.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: C.t2, fontWeight: 600, marginBottom: 8 }}>SENSORS FOUND</div>
          {detectedSrc.map((s, i) => (
            <Glass key={i} style={{ padding: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: C.t1, fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: C.t3 }}>~{s.mw} mW harvestable</div>
              </div>
              <div style={{
                fontSize: 10, padding: "3px 10px", borderRadius: 10, fontWeight: 600,
                background: s.ok ? "#16A34A22" : "#EF444422",
                color: s.ok ? C.green : C.red
              }}>
                {s.ok ? "detected" : "unavailable"}
              </div>
            </Glass>
          ))}
        </div>
      )}

      {!detecting && detectedSrc.length === 0 && (
        <Glass style={{ padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
          <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.7 }}>
            DETECT button press பண்ணினா<br />
            Phone-ன் Mic, Accelerometer, GPS, Light sensor<br />
            எல்லாம் ஒரே நேரத்தில் ON ஆகும்<br />
            <span style={{ color: C.cyan, fontWeight: 600 }}>
              Train-ல் வச்சா vibration detect ஆகும் 🚆
            </span>
          </div>
        </Glass>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  SCREEN 3 — ANALYTICS
// ══════════════════════════════════════════════════════════════
function Analytics({ state }) {
  if (!state) return null;
  const pieData = Object.entries(state.rates).map(([id, v]) => ({
    name: SOURCES[id].label, value: v, color: SOURCES[id].color
  }));
  const totalToday = Object.values(state.todayTotals).reduce((a, b) => a + b, 0);

  return (
    <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.t1 }}>📊 Analytics</div>

      <div style={{ display: "flex", gap: 10 }}>
        {[
          { l: "Today (kWh)", v: (totalToday / 1000).toFixed(2), c: C.green },
          { l: "AI Score",    v: "94 / 100",                      c: C.cyan  },
          { l: "CO₂ (kg)",   v: state.co2Saved,                  c: C.greenSoft },
        ].map(s => (
          <Glass key={s.l} style={{ flex: 1, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, color: C.t3, marginBottom: 2 }}>{s.l}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
          </Glass>
        ))}
      </div>

      {/* Area chart */}
      <Glass style={{ padding: "14px 8px 4px" }}>
        <div style={{ fontSize: 11, color: C.t2, fontWeight: 600, marginBottom: 8, paddingLeft: 8 }}>
          24h Generation Trend (Solar + Wind + Human)
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={state.history}>
            <defs>
              <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.orange} stopOpacity={0.5} /><stop offset="100%" stopColor={C.orange} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.cyan} stopOpacity={0.4} /><stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: C.t3, fontSize: 9 }} axisLine={false} tickLine={false} interval={5} />
            <YAxis tick={{ fill: C.t3, fontSize: 9 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={{ background: C.navy2, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 11 }} />
            <Area type="monotone" dataKey="solar"  stroke={C.orange} fill="url(#ag1)" strokeWidth={2} name="Solar (W)" />
            <Area type="monotone" dataKey="wind"   stroke={C.cyan}   fill="url(#ag2)" strokeWidth={2} name="Wind (W)"  />
            <Area type="monotone" dataKey="human"  stroke={C.green}  fill="none"      strokeWidth={1.5} strokeDasharray="3 2" name="Human (W)" />
          </AreaChart>
        </ResponsiveContainer>
      </Glass>

      {/* Pie + Bar */}
      <div style={{ display: "flex", gap: 12 }}>
        <Glass style={{ flex: 1, padding: "14px 4px 4px" }}>
          <div style={{ fontSize: 11, color: C.t2, fontWeight: 600, marginBottom: 4, paddingLeft: 8 }}>
            Source Mix Now
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} dataKey="value" innerRadius={36} outerRadius={58} paddingAngle={2}>
                {pieData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={{ background: C.navy2, border: `1px solid ${C.border}`, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Glass>

        <Glass style={{ flex: 1, padding: "14px 4px 4px" }}>
          <div style={{ fontSize: 11, color: C.t2, fontWeight: 600, marginBottom: 4, paddingLeft: 8 }}>
            Today (Wh)
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={Object.entries(state.todayTotals).map(([id, v]) => ({
              name: SOURCES[id].label.slice(0, 4), v, fill: SOURCES[id].color
            }))}>
              <XAxis dataKey="name" tick={{ fill: C.t3, fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.t3, fontSize: 8 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ background: C.navy2, border: `1px solid ${C.border}`, fontSize: 11 }} />
              <Bar dataKey="v" radius={[5, 5, 0, 0]}>
                {Object.keys(state.todayTotals).map((id, i) => <Cell key={i} fill={SOURCES[id].color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Glass>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  SCREEN 4 — SOURCE GUIDE
// ══════════════════════════════════════════════════════════════
function SourceGuide() {
  const [open, setOpen] = useState(null);
  return (
    <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginBottom: 4 }}>
        ⚡ Energy Source Guide
      </div>
      <div style={{ fontSize: 11, color: C.t3, marginBottom: 4 }}>
        Tap any category to see how to harvest electricity from it
      </div>
      {GUIDE.map((cat, ci) => (
        <Glass key={ci} style={{ overflow: "hidden" }}>
          <button
            onClick={() => setOpen(open === ci ? null : ci)}
            style={{
              width: "100%", padding: "14px 16px",
              background: "none", border: "none",
              display: "flex", alignItems: "center", gap: 12,
              cursor: "pointer", textAlign: "left"
            }}
          >
            <span style={{ fontSize: 24 }}>{cat.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.t1, flex: 1 }}>{cat.cat}</span>
            <span style={{
              fontSize: 10, padding: "3px 10px", borderRadius: 10, fontWeight: 600,
              background: `${cat.color}22`, color: cat.color
            }}>{cat.items.length} sources</span>
            <span style={{
              color: C.t3, fontSize: 18, transition: "transform .2s",
              display: "inline-block",
              transform: open === ci ? "rotate(90deg)" : "rotate(0deg)"
            }}>›</span>
          </button>
          {open === ci && (
            <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {cat.items.map((item, ii) => (
                <div key={ii} style={{
                  background: "rgba(255,255,255,0.03)", borderRadius: 10,
                  padding: "10px 12px", border: `1px solid ${cat.color}22`
                }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 4
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.t1 }}>{item.name}</span>
                    <span style={{ fontSize: 10, color: cat.color, fontWeight: 600 }}>{item.hw}</span>
                  </div>
                  <div style={{ fontSize: 10, color: C.t3 }}>
                    Technology: <span style={{ color: C.t2 }}>{item.tech}</span>
                  </div>
                  <div style={{ fontSize: 10, color: C.t3 }}>
                    Hardware: <span style={{ color: C.t2 }}>{item.tool}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Glass>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  SCREEN 5 — AI ASSISTANT (Claude API)
// ══════════════════════════════════════════════════════════════
const QUICK_Q = [
  "How much energy did I generate today?",
  "Which source is performing best?",
  "How to improve battery life?",
  "Explain piezoelectric energy harvesting",
  "What is UEHM in GreenPulse AI?",
  "What is Universal Hybrid Energy Orchestration?",
];

function AIAssistant({ state }) {
  const [msgs, setMsgs]     = useState([{
    role: "assistant",
    content: "வணக்கம்! I'm GreenPulse AI Assistant 🌿\n\nI can answer your energy questions, explain harvesting technologies, and help optimize your system.\n\nType a question below or tap a quick button!"
  }]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey]  = useState(() => load("gp:apikey") || "");
  const [showKey, setShowKey] = useState(false);
  const endRef = useRef();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async (text) => {
    const q = text || input.trim();
    if (!q || loading) return;
    setInput("");

    const next = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    setLoading(true);

    if (!apiKey) {
      setMsgs(m => [...m, {
        role: "assistant",
        content: "⚠️ API Key தேவை! மேலே ⚙️ button press பண்ணி உன் Anthropic API key add பண்ணு.\n\nKey இல்லாம பதில் வராது."
      }]);
      setLoading(false);
      return;
    }

    const ctx = state
      ? `Live system data: Battery ${Math.round(state.soc)}% SOC, Solar ${state.rates.solar}W, Wind ${state.rates.wind}W, Human ${state.rates.human}W, Transport ${state.rates.transport}W, Industrial ${state.rates.industrial}W, CO₂ saved today ${state.co2Saved}kg, Today total ${(Object.values(state.todayTotals).reduce((a,b)=>a+b,0)/1000).toFixed(2)}kWh.`
      : "";

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 500,
          system: `You are GreenPulse AI, an expert assistant for a Universal Hybrid Energy Orchestration Platform built for Smart India Hackathon 2024. Help with energy harvesting (piezoelectric, thermoelectric, electromagnetic, photovoltaic), IoT, battery management, UEHM (Universal Energy Harvester Module), MSME energy solutions, and renewable energy. ${ctx} Be concise, helpful, and enthusiastic about green energy. Mix simple English with occasional Tamil words when appropriate.`,
          messages: next.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Sorry, no response received. Please try again.";
      setMsgs(m => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setMsgs(m => [...m, { role: "assistant", content: `Network error: ${e.message}. Check your internet connection and API key.` }]);
    }
    setLoading(false);
  };

  const saveKey = (k) => {
    setApiKey(k);
    save("gp:apikey", k);
  };

  return (
    <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", height: "calc(100dvh - 130px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.t1 }}>🤖 AI Assistant</div>
        <button onClick={() => setShowKey(v => !v)} style={{
          background: apiKey ? "#16A34A22" : "#EF444422",
          border: `1px solid ${apiKey ? C.green : C.red}44`,
          borderRadius: 20, padding: "4px 12px", fontSize: 10,
          color: apiKey ? C.green : C.red, cursor: "pointer", fontWeight: 600
        }}>
          ⚙️ {apiKey ? "API ✓" : "Set API Key"}
        </button>
      </div>

      {/* API Key input */}
      {showKey && (
        <Glass style={{ padding: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: C.t2, marginBottom: 6 }}>
            Anthropic API Key (claude.ai → Settings → API Keys)
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="password"
              value={apiKey}
              onChange={e => saveKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              style={{
                flex: 1, background: "rgba(255,255,255,0.07)",
                border: `1px solid ${C.border}`, borderRadius: 10,
                padding: "8px 12px", color: C.t1, fontSize: 12,
                outline: "none", fontFamily: "monospace"
              }}
            />
            <button onClick={() => setShowKey(false)} style={{
              padding: "8px 14px", borderRadius: 10, border: "none",
              background: C.green, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600
            }}>Save</button>
          </div>
        </Glass>
      )}

      {/* Quick question chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {QUICK_Q.map((q, i) => (
          <button key={i} onClick={() => send(q)} style={{
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${C.border}`,
            borderRadius: 20, padding: "5px 12px",
            fontSize: 10, color: C.cyan, cursor: "pointer"
          }}>{q}</button>
        ))}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", display: "flex",
        flexDirection: "column", gap: 10, paddingBottom: 8
      }}>
        {msgs.map((m, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: m.role === "user" ? "flex-end" : "flex-start"
          }}>
            <div style={{
              maxWidth: "84%", padding: "10px 14px",
              borderRadius: m.role === "user"
                ? "16px 16px 4px 16px"
                : "4px 16px 16px 16px",
              fontSize: 12, lineHeight: 1.55,
              background: m.role === "user" ? C.green : "rgba(255,255,255,0.08)",
              color: m.role === "user" ? "#fff" : C.t1,
              whiteSpace: "pre-wrap"
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 5, padding: "10px 14px" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: "50%",
                background: C.green,
                animation: `gp-bounce 0.6s ${i * 0.2}s infinite alternate`
              }} />
            ))}
          </div>
        )}
        <style>{`
          @keyframes gp-bounce {
            from { transform: translateY(0);  opacity: 0.5; }
            to   { transform: translateY(-6px); opacity: 1; }
          }
        `}</style>
        <div ref={endRef} />
      </div>

      {/* Input row */}
      <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask about your energy system…"
          style={{
            flex: 1, background: "rgba(255,255,255,0.07)",
            border: `1px solid ${C.border}`, borderRadius: 24,
            padding: "10px 16px", color: C.t1, fontSize: 12,
            outline: "none", fontFamily: "inherit"
          }}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{
            padding: "10px 18px", borderRadius: 24,
            border: "none", background: C.green,
            color: "#fff", cursor: "pointer",
            fontSize: 16, fontWeight: 700,
            opacity: loading || !input.trim() ? 0.5 : 1
          }}
        >➤</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ROOT APP
// ══════════════════════════════════════════════════════════════
const NAV = [
  { id: "dashboard", icon: "🏠", label: "Home"      },
  { id: "detect",    icon: "⚡", label: "Detect"    },
  { id: "analytics", icon: "📊", label: "Analytics" },
  { id: "sources",   icon: "🔋", label: "Sources"   },
  { id: "ai",        icon: "🤖", label: "AI Chat"   },
];

export default function App() {
  const [screen, setScreen] = useState("dashboard");
  const [state, setState]   = useState(null);

  // Load from localStorage
  useEffect(() => {
    const saved = load("gp:state");
    setState(saved || defaultState());
  }, []);

  // Live sensor simulation (every 3s)
  useEffect(() => {
    if (!state) return;
    const id = setInterval(() => {
      setState(prev => {
        if (!prev) return prev;
        const rates = {
          solar:      Math.round(rw(prev.rates.solar,      5,  95, 16)),
          wind:       Math.round(rw(prev.rates.wind,       3,  50,  9)),
          human:      Math.round(rw(prev.rates.human,      0,  15,  3)),
          transport:  Math.round(rw(prev.rates.transport,  0,  12,  2.5)),
          industrial: Math.round(rw(prev.rates.industrial, 1,  22,  4)),
        };
        const totalW = Object.values(rates).reduce((a, b) => a + b, 0);
        const draw   = Math.max(8, 35 - totalW / 15);
        const soc    = Math.max(2, Math.min(100, prev.soc + (totalW / 60 - draw / 60) * 0.05));

        const todayTotals = Object.fromEntries(
          Object.entries(prev.todayTotals).map(([id, v]) => [id, v + Math.round(rates[id] / 20)])
        );
        const totalWh  = Object.values(todayTotals).reduce((a, b) => a + b, 0);
        const co2Saved = +(totalWh * 0.00072).toFixed(2);
        const newPt    = {
          label: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          ...rates
        };
        const next = {
          soc, rates, todayTotals, co2Saved,
          history: [...prev.history.slice(-23), newPt],
          lastUpdated: Date.now()
        };
        save("gp:state", next);
        return next;
      });
    }, 3000); 
    return () => clearInterval(id);
  }, [!!state]);

  return (
    <div style={{
      maxWidth: 480, margin: "0 auto", minHeight: "100dvh",
      background: `radial-gradient(ellipse at top, ${C.navy2} 0%, ${C.navy} 60%)`,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: C.t1, display: "flex", flexDirection: "column",
      position: "relative"
    }}>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 72 }}>
        {screen === "dashboard" && <Dashboard state={state} />}
        {w === "detect"    && <DetectEnergy />}
        {screen === "analytics" && <Analytics state={state} />}
        {screen === "sources"   && <SourceGuide />}
        {screen === "ai"        && <AIAssistant state={state} />}
      </div>

      {/* Bottom navigation */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        background: `${C.navy}f0`,
        borderTop: `1px solid ${C.border}`,
        backdropFilter: "blur(20px)",
        display: "flex", zIndex: 100
      }}>
        {NAV.map(n => (
          <NavBtn key={n.id} {...n} active={screen === n.id} onClick={() => setScreen(n.id)} />
        ))}
      </div>
    </div>
  );
}
