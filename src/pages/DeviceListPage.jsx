import { useState, useEffect, useRef, useCallback } from "react";
import {
  Zap, Cpu, Plus, ChevronRight, ChevronLeft,
  Wifi, CheckCircle, RefreshCw, MapPin, Tag, 
  Sliders, ArrowRight, Shield, Lock, X, Radio
} from "lucide-react";
import { Card }   from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";

/* ═══════════════════════════════════════════════════════════════
   CSS
═══════════════════════════════════════════════════════════════ */
const PAIRING_CSS = `
@keyframes pm-fade-in    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes pm-scale-in   { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
@keyframes pm-slide-r    { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:translateX(0)} }
@keyframes pm-spin       { to{transform:rotate(360deg)} }
@keyframes pm-ping       { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2.4);opacity:0} }
@keyframes pm-scan-line  { 0%{top:8%} 100%{top:92%} }
@keyframes pm-bounce-dot { 0%,80%,100%{transform:scale(0);opacity:.4} 40%{transform:scale(1);opacity:1} }
@keyframes pm-success    { 0%{transform:scale(0) rotate(-30deg);opacity:0} 60%{transform:scale(1.15) rotate(4deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
@keyframes pm-checkdraw  { from{stroke-dashoffset:100} to{stroke-dashoffset:0} }
@keyframes pm-row-in     { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
@keyframes pm-shimmer    { from{transform:translateX(-100%)} to{transform:translateX(100%)} }

/* ── WiFi scan NEW animations ── */
@keyframes radar-sweep {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes radar-ring-pulse {
  0%   { transform: scale(1);   opacity: .5; }
  100% { transform: scale(1.9); opacity: 0;  }
}
@keyframes device-pop {
  0%   { opacity:0; transform:translateY(10px) scale(.95); }
  60%  { transform:translateY(-3px) scale(1.02); }
  100% { opacity:1; transform:translateY(0) scale(1); }
}
@keyframes dot-blink {
  0%,100% { opacity:.2; } 50% { opacity:1; }
}
@keyframes signal-bar-grow {
  from { transform: scaleY(0); }
  to   { transform: scaleY(1); }
}
@keyframes scan-ticker {
  0%   { width:0%;   opacity:1; }
  80%  { width:100%; opacity:1; }
  100% { width:100%; opacity:0; }
}
@keyframes glow-pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); }
  50%      { box-shadow: 0 0 18px 4px rgba(249,115,22,.25); }
}
@keyframes ping-dot {
  0%   { transform:scale(1); opacity:1; }
  100% { transform:scale(3); opacity:0; }
}

.pm-overlay {
  position:fixed; inset:0; z-index:10000;
  background:rgba(3,5,10,.82); backdrop-filter:blur(8px);
  display:flex; align-items:center; justify-content:center;
  padding:16px; animation:pm-fade-in .25s ease;
}
.pm-modal {
  background:var(--card); border:1px solid var(--bd2,var(--bd)); border-radius:22px;
  width:100%; max-width:520px; max-height:90vh; overflow:hidden;
  display:flex; flex-direction:column;
  box-shadow:0 32px 80px rgba(0,0,0,.6),0 0 0 1px rgba(249,115,22,.08);
  animation:pm-scale-in .28s cubic-bezier(.34,1.56,.64,1);
}
.pm-content { flex:1; overflow-y:auto; }
.pm-content::-webkit-scrollbar { width:3px; }
.pm-content::-webkit-scrollbar-thumb { background:rgba(255,255,255,.12); border-radius:99px; }
.pm-method-card {
  border:1.5px solid var(--bd); border-radius:14px; padding:18px;
  cursor:pointer; transition:all .2s; background:var(--input);
}
.pm-method-card:hover  { border-color:rgba(249,115,22,.55); background:rgba(249,115,22,.04); transform:translateY(-1px); }
.pm-method-card.active { border-color:#f97316; background:rgba(249,115,22,.07); box-shadow:0 0 0 3px rgba(249,115,22,.12); }
.pm-input {
  width:100%; padding:11px 14px; border-radius:10px;
  background:var(--input); border:1.5px solid var(--bd);
  color:var(--t1); font-size:14px; font-weight:500; outline:none;
  transition:border-color .18s; font-family:inherit; box-sizing:border-box;
}
.pm-input:focus { border-color:rgba(249,115,22,.55); }
.pm-input.mono  { font-family:'IBM Plex Mono',monospace; letter-spacing:.5px; }
.pm-btn-primary {
  display:flex; align-items:center; justify-content:center; gap:8px;
  width:100%; padding:13px; border-radius:12px;
  font-size:14px; font-weight:700; cursor:pointer;
  background:#f97316; border:none; color:#fff;
  box-shadow:0 4px 18px rgba(249,115,22,.35); transition:opacity .15s,transform .15s;
}
.pm-btn-primary:hover    { opacity:.92; transform:translateY(-1px); }
.pm-btn-primary:disabled { opacity:.4; cursor:not-allowed; transform:none; }
.pm-btn-ghost {
  display:flex; align-items:center; justify-content:center; gap:7px;
  padding:10px 18px; border-radius:10px; font-size:13px; font-weight:600;
  cursor:pointer; background:var(--input); border:1px solid var(--bd);
  color:var(--t2); transition:all .15s;
}
.pm-btn-ghost:hover { opacity:.85; }
.pm-bar-track { height:3px; background:rgba(255,255,255,.08); border-radius:99px; overflow:hidden; }
.pm-bar-fill  { height:100%; background:linear-gradient(90deg,#f97316,#fb923c); border-radius:99px; transition:width .5s cubic-bezier(.4,0,.2,1); }
.pm-shimmer-row {
  height:56px; border-radius:12px; background:var(--input);
  border:1.5px solid var(--bd); margin-bottom:8px; overflow:hidden; position:relative;
}
.pm-shimmer-row::after {
  content:''; position:absolute; inset:0;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent);
  transform:translateX(-100%); animation:pm-shimmer 1.4s ease infinite;
}

/* ── WiFi scan specific ── */
.radar-container {
  position:relative; width:168px; height:168px; margin:0 auto;
  flex-shrink:0;
}
.radar-ring {
  position:absolute; border-radius:50%;
  border:1px solid rgba(249,115,22,.18);
  top:50%; left:50%; transform:translate(-50%,-50%);
}
.radar-sweep {
  position:absolute; inset:0; border-radius:50%; overflow:hidden;
}
.radar-sweep-beam {
  position:absolute; inset:0; border-radius:50%;
  background:conic-gradient(from 0deg,rgba(249,115,22,.0) 0deg,rgba(249,115,22,.0) 290deg,rgba(249,115,22,.18) 340deg,rgba(249,115,22,.45) 360deg);
  animation:radar-sweep 2.2s linear infinite;
}
.radar-center {
  position:absolute; inset:0;
  display:flex; align-items:center; justify-content:center;
}
.radar-pulse-ring {
  position:absolute; border-radius:50%; border:1.5px solid rgba(249,115,22,.35);
  animation:radar-ring-pulse 2.2s ease-out infinite;
}
.wifi-device-card {
  display:flex; align-items:center; gap:12px;
  padding:14px 16px; border-radius:14px; cursor:pointer;
  border:1.5px solid var(--bd); background:var(--input);
  transition:all .22s cubic-bezier(.34,1.3,.64,1);
  animation:device-pop .42s cubic-bezier(.34,1.3,.64,1) both;
  position:relative; overflow:hidden;
}
.wifi-device-card::before {
  content:''; position:absolute; inset:0; opacity:0;
  background:linear-gradient(120deg,rgba(249,115,22,.04),transparent);
  transition:opacity .2s;
}
.wifi-device-card:hover {
  border-color:rgba(249,115,22,.5);
  transform:translateY(-2px);
  box-shadow:0 6px 24px rgba(249,115,22,.1);
}
.wifi-device-card:hover::before { opacity:1; }
.wifi-device-card.selected {
  border-color:#f97316;
  background:rgba(249,115,22,.07);
  box-shadow:0 0 0 3px rgba(249,115,22,.12),0 6px 24px rgba(249,115,22,.12);
}
.signal-bar-wrap {
  display:flex; align-items:flex-end; gap:2.5px;
}
.signal-bar-item {
  border-radius:2px;
  transform-origin:bottom center;
  animation:signal-bar-grow .35s ease both;
}
`;

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */
const MOCK_NEARBY = [
  { mac:"A4:CF:12:8B:3E:01", ssid:"ESP32-Energy-3E01", rssi:-42, fw:"v2.1.4", ip:"192.168.1.101", uptime:"3d 14h" },
  { mac:"B8:D6:1A:4C:9F:12", ssid:"ESP32-Energy-9F12", rssi:-61, fw:"v2.0.9", ip:"192.168.1.104", uptime:"1d 2h"  },
  { mac:"CC:50:E3:7D:2A:33", ssid:"ESP32-Energy-2A33", rssi:-78, fw:"v2.1.0", ip:"192.168.1.108", uptime:"6h 22m" },
];

function rssiToStrength(rssi) {
  if (rssi >= -55) return { bars:4, label:"Sangat Kuat", color:"#22c55e" };
  if (rssi >= -67) return { bars:3, label:"Kuat",        color:"#84cc16" };
  if (rssi >= -75) return { bars:2, label:"Sedang",      color:"#f59e0b" };
  return             { bars:1, label:"Lemah",             color:"#ef4444" };
}

function generateDeviceId() {
  const hex = () => Math.floor(Math.random()*256).toString(16).padStart(2,"0").toUpperCase();
  return `ESP32-${hex()}${hex()}`.slice(0,10);
}

/* ═══════════════════════════════════════════════════════════════
   SHARED ATOMS
═══════════════════════════════════════════════════════════════ */
function SignalBars({ rssi, size=14 }) {
  const { bars, color } = rssiToStrength(rssi);
  return (
    <div className="signal-bar-wrap">
      {[1,2,3,4].map(i=>(
        <div key={i} className="signal-bar-item" style={{
          width: size/5+2, height:(size/4)*i, borderRadius:2,
          background:i<=bars?color:"rgba(255,255,255,.1)",
          animationDelay:`${i*60}ms`
        }}/>
      ))}
    </div>
  );
}

function SpinRing({ size=48, color="#f97316", strokeWidth=3 }) {
  const r = (size-strokeWidth*2)/2, c = 2*Math.PI*r;
  return (
    <svg width={size} height={size} style={{ animation:"pm-spin .9s linear infinite" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={strokeWidth}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={`${c*.72} ${c*.28}`}/>
    </svg>
  );
}

function SuccessCheck({ size=72 }) {
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"rgba(34,197,94,.15)",
        animation:"pm-ping 1.4s ease-out infinite" }}/>
      <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"rgba(34,197,94,.1)",
        animation:"pm-ping 1.4s ease-out .5s infinite" }}/>
      <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"rgba(34,197,94,.18)",
        display:"flex", alignItems:"center", justifyContent:"center",
        animation:"pm-success .5s cubic-bezier(.34,1.56,.64,1) both" }}>
        <svg width={size*.55} height={size*.55} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" fill="#22c55e"/>
          <polyline points="5.5,12 10,16.5 18.5,7.5" stroke="#fff" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" strokeDasharray="100"
            style={{ animation:"pm-checkdraw .4s ease .3s both" }}/>
        </svg>
      </div>
    </div>
  );
}

function StepIndicator({ current, labels }) {
  return (
    <div style={{ display:"flex", alignItems:"center", padding:"0 24px", marginBottom:20 }}>
      {labels.map((label, i) => {
        const done = i < current, active = i === current;
        return (
          <div key={i} style={{ display:"flex", alignItems:"center", flex:i<labels.length-1?1:"none" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, flexShrink:0 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:11, fontWeight:700,
                background:done?"#22c55e":active?"#f97316":"rgba(255,255,255,.08)",
                color:done||active?"#fff":"var(--t4)",
                boxShadow:active?"0 0 0 4px rgba(249,115,22,.2)":done?"0 0 0 3px rgba(34,197,94,.2)":"none",
                transition:"all .3s" }}>
                {done?<CheckCircle size={14}/>:i+1}
              </div>
              <span style={{ fontSize:9, fontWeight:600, textTransform:"uppercase", letterSpacing:.7,
                color:active?"#f97316":done?"#22c55e":"var(--t4)", whiteSpace:"nowrap" }}>{label}</span>
            </div>
            {i<labels.length-1 && (
              <div style={{ flex:1, height:2, background:done?"#22c55e":"rgba(255,255,255,.08)",
                margin:"0 6px", marginBottom:18, transition:"background .3s" }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   WIFI SCAN — REDESIGNED
═══════════════════════════════════════════════════════════════ */
function RadarDisc({ scanning }) {
  return (
    <div className="radar-container">
      {[140,104,68,36].map((d,i)=>(
        <div key={d} className="radar-ring" style={{ width:d, height:d }}/>
      ))}
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ position:"absolute", width:"100%", height:"1px", background:"rgba(249,115,22,.1)" }}/>
        <div style={{ position:"absolute", width:"1px", height:"100%", background:"rgba(249,115,22,.1)" }}/>
      </div>
      {scanning && (
        <div className="radar-sweep">
          <div className="radar-sweep-beam"/>
        </div>
      )}
      {scanning && (
        <div className="radar-pulse-ring" style={{ width:100, height:100,
          position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)" }}/>
      )}
      <div className="radar-center">
        <div style={{
          width:40, height:40, borderRadius:"50%",
          background: scanning ? "rgba(249,115,22,.15)" : "rgba(255,255,255,.06)",
          border: `2px solid ${scanning ? "rgba(249,115,22,.4)" : "rgba(255,255,255,.1)"}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"all .4s",
          animation: scanning ? "glow-pulse 2s ease infinite" : "none"
        }}>
          <Wifi size={18} color={scanning ? "#f97316" : "var(--t3)"} style={{ transition:"color .4s" }}/>
        </div>
      </div>
    </div>
  );
}

function RadarDot({ angle, dist, delay=0 }) {
  const rad = (angle * Math.PI) / 180;
  const x = 50 + dist * Math.cos(rad);
  const y = 50 + dist * Math.sin(rad);
  return (
    <div style={{
      position:"absolute",
      left:`${x}%`, top:`${y}%`,
      transform:"translate(-50%,-50%)",
      width:8, height:8,
    }}>
      <div style={{
        position:"absolute", inset:0, borderRadius:"50%",
        background:"#f97316", opacity:.8,
        animation:`ping-dot 2s ease-out ${delay}s infinite`
      }}/>
      <div style={{
        position:"absolute", inset:"2px", borderRadius:"50%",
        background:"#fb923c",
      }}/>
    </div>
  );
}

function WiFiDeviceCard({ dev, selected, onSelect, index }) {
  const sig = rssiToStrength(dev.rssi);
  return (
    <div
      className={`wifi-device-card ${selected ? "selected" : ""}`}
      onClick={()=>onSelect(dev)}
      style={{ animationDelay:`${index * 100}ms`, marginBottom:10 }}
    >
      <div style={{ position:"relative", flexShrink:0 }}>
        <div style={{
          width:44, height:44, borderRadius:13,
          background: selected ? "rgba(249,115,22,.15)" : "var(--bg,rgba(255,255,255,.04))",
          border:`1.5px solid ${selected ? "rgba(249,115,22,.4)" : "var(--bd)"}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"all .2s"
        }}>
          <Cpu size={20} color={selected ? "#f97316" : "var(--t3)"} style={{ transition:"color .2s" }}/>
        </div>
        <div style={{
          position:"absolute", top:-3, right:-3,
          width:10, height:10, borderRadius:"50%",
          background:"#22c55e", border:"2px solid var(--card,var(--input))",
        }}/>
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
          <p style={{ fontSize:13, fontWeight:700, color:"var(--t1)", lineHeight:1 }}>{dev.ssid}</p>
          <span style={{
            fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:99,
            background:"rgba(34,197,94,.12)", color:"#22c55e",
            border:"1px solid rgba(34,197,94,.25)", textTransform:"uppercase", letterSpacing:.5
          }}>Online</span>
        </div>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <span style={{ fontSize:10, color:"var(--t4)", fontFamily:"'IBM Plex Mono',monospace" }}>{dev.mac}</span>
          {dev.ip && <span style={{ fontSize:10, color:"var(--t4)" }}>IP: <span style={{ color:"var(--t3)" }}>{dev.ip}</span></span>}
          {dev.fw && <span style={{ fontSize:10, color:"var(--t4)" }}>FW: <span style={{ color:"var(--t3)" }}>{dev.fw}</span></span>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6 }}>
          <div style={{ flex:1, height:3, borderRadius:99, background:"rgba(255,255,255,.07)", overflow:"hidden" }}>
            <div style={{
              height:"100%", borderRadius:99,
              width:`${Math.round(((dev.rssi+100)/50)*100).toString().replace(/^.*\s/,"")}%`,
              background:`linear-gradient(90deg,${sig.color}aa,${sig.color})`,
              maxWidth:"100%",
              transition:"width .6s ease"
            }}/>
          </div>
          <span style={{ fontSize:9, fontWeight:700, color:sig.color, flexShrink:0 }}>{sig.label}</span>
          <span style={{ fontSize:9, color:"var(--t4)", flexShrink:0 }}>{dev.rssi} dBm</span>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
        <SignalBars rssi={dev.rssi} size={18}/>
        {selected
          ? <CheckCircle size={16} color="#f97316"/>
          : <ChevronRight size={14} color="var(--t4)"/>
        }
      </div>
    </div>
  );
}

const SCAN_LOGS = [
  "Menyiarkan ARP ke 192.168.1.0/24…",
  "Memindai port 80, 8080, 8266…",
  "Memeriksa mDNS esp32.local…",
  "Mendeteksi ESP32-Energy-3E01…",
  "Mendeteksi ESP32-Energy-9F12…",
  "Memvalidasi fingerprint perangkat…",
  "Mendeteksi ESP32-Energy-2A33…",
  "Scan jaringan selesai ✓",
];

function StepScanWifi({ onFound }) {
  const [scanState, setScanState] = useState("idle");
  const [found,     setFound]     = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [logIdx,    setLogIdx]    = useState(0);
  const timerRef = useRef(null);
  const logRef   = useRef(null);

  const startScan = useCallback(()=>{
    setScanState("scanning"); setFound([]); setSelected(null); setLogIdx(0);
    let l = 0;
    logRef.current = setInterval(()=>{
      l++;
      setLogIdx(l);
      if(l >= SCAN_LOGS.length - 1) clearInterval(logRef.current);
    }, 520);
    let s = 0;
    timerRef.current = setInterval(()=>{
      s++;
      if(s===1) setFound([MOCK_NEARBY[0]]);
      if(s===2) setFound(p=>[...p, MOCK_NEARBY[1]]);
      if(s===4){ setFound(p=>[...p, MOCK_NEARBY[2]]); setScanState("found"); clearInterval(timerRef.current); }
    }, 900);
  },[]);

  useEffect(()=>()=>{ clearInterval(timerRef.current); clearInterval(logRef.current); },[]);

  const scanning = scanState === "scanning";

  if(scanState === "idle") return (
    <div style={{ padding:"0 24px 24px", animation:"pm-slide-r .3s ease" }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>

        <RadarDisc scanning={false}/>

        <div style={{
          marginTop:18, marginBottom:22,
          display:"flex", gap:16, justifyContent:"center"
        }}>
          {[["Jaringan","Local LAN"],["Protokol","mDNS + ARP"],["Port","80 · 8080"]].map(([k,v])=>(
            <div key={k} style={{ textAlign:"center" }}>
              <p style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:.9,
                color:"var(--t4)", marginBottom:3 }}>{k}</p>
              <p style={{ fontSize:11, fontWeight:600, color:"var(--t2)",
                fontFamily:"'IBM Plex Mono',monospace" }}>{v}</p>
            </div>
          ))}
        </div>

        <button className="pm-btn-primary" onClick={startScan} style={{ maxWidth:280 }}>
          <Radio size={15}/> Mulai Scan Jaringan
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ padding:"0 24px 24px", animation:"pm-slide-r .3s ease" }}>
      <div style={{ display:"flex", gap:20, alignItems:"flex-start", marginBottom:18 }}>
        <div style={{ flexShrink:0, position:"relative" }}>
          <RadarDisc scanning={scanning}/>
          {found.length > 0 && (
            <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
              {found.map((_, i)=>(
                <RadarDot key={i}
                  angle={[310, 45, 195][i] || 90}
                  dist={[18, 24, 30][i] || 20}
                  delay={i * 0.4}
                />
              ))}
            </div>
          )}
        </div>

        <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{
            display:"flex", alignItems:"center", gap:8,
            padding:"8px 12px", borderRadius:10, width:"fit-content",
            background: scanning ? "rgba(249,115,22,.08)" : "rgba(34,197,94,.07)",
            border:`1px solid ${scanning ? "rgba(249,115,22,.25)" : "rgba(34,197,94,.25)"}`,
          }}>
            {scanning
              ? <><SpinRing size={14} color="#f97316" strokeWidth={2}/> <span style={{ fontSize:11, fontWeight:700, color:"#f97316" }}>Memindai…</span></>
              : <><CheckCircle size={13} color="#22c55e"/>              <span style={{ fontSize:11, fontWeight:700, color:"#22c55e" }}>Scan Selesai</span></>
            }
          </div>

          <div style={{ display:"flex", gap:10 }}>
            {[
              { label:"Ditemukan", value:found.length, color:"#f97316" },
              { label:"Online",    value:found.filter(d=>d).length, color:"#22c55e" },
            ].map(s=>(
              <div key={s.label} style={{
                flex:1, padding:"8px 10px", borderRadius:10,
                background:"var(--input)", border:"1px solid var(--bd)", textAlign:"center"
              }}>
                <p style={{ fontSize:20, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</p>
                <p style={{ fontSize:9, color:"var(--t4)", marginTop:3, textTransform:"uppercase", letterSpacing:.7 }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div style={{
            background:"rgba(0,0,0,.2)", borderRadius:10, padding:"8px 10px",
            border:"1px solid rgba(255,255,255,.05)", minHeight:52,
            display:"flex", flexDirection:"column", justifyContent:"center"
          }}>
            <p style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:.9,
              color:"var(--t4)", marginBottom:4 }}>LOG</p>
            {SCAN_LOGS.slice(0, logIdx+1).reverse().slice(0,2).map((log,i)=>(
              <p key={i} style={{
                fontSize:10, color: i===0?"var(--t2)":"var(--t4)",
                fontFamily:"'IBM Plex Mono',monospace",
                lineHeight:1.5, opacity: i===0?1:.5,
                overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis"
              }}>{log}</p>
            ))}
          </div>
        </div>
      </div>

      {found.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <p style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"var(--t4)" }}>
              Perangkat Terdeteksi
            </p>
            {!scanning && (
              <button onClick={startScan}
                style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600,
                  color:"var(--t3)", background:"none", border:"none", cursor:"pointer",
                  padding:"4px 8px", borderRadius:7, background:"var(--input)",
                  border:"1px solid var(--bd)" }}>
                <RefreshCw size={11}/> Ulangi Scan
              </button>
            )}
          </div>
          {found.map((dev, i)=>(
            <WiFiDeviceCard key={dev.mac} dev={dev} index={i}
              selected={selected?.mac === dev.mac}
              onSelect={setSelected}/>
          ))}
          {scanning && <div className="pm-shimmer-row" style={{ marginTop:0 }}/>}
        </div>
      )}

      {scanning && found.length === 0 && (
        <div style={{ marginBottom:14 }}>
          <p style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1,
            color:"var(--t4)", marginBottom:10 }}>Memindai Perangkat…</p>
          {[0,1].map(i=><div key={i} className="pm-shimmer-row"/>)}
        </div>
      )}

      {selected && (
        <button className="pm-btn-primary" onClick={()=>onFound(selected)}>
          Lanjutkan dengan {selected.ssid} <ArrowRight size={15}/>
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   WIZARD STEPS
═══════════════════════════════════════════════════════════════ */

/* Step 2 — Konfigurasi (SUDAH DIUPDATE) */
function StepConfigure({ deviceInfo, onDone }) {
  // State kosong di awal agar user WAJIB isi, nggak ada default value lagi
  const [form, setForm] = useState({ name:"", location:"", maxCurrent:10, tariff:1444 });
  const sig = deviceInfo ? rssiToStrength(deviceInfo.rssi) : null;

  return (
    <div style={{ padding:"0 24px 24px", animation:"pm-slide-r .3s ease" }}>
      {deviceInfo && (
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12,
          background:"rgba(249,115,22,.07)", border:"1px solid rgba(249,115,22,.2)", marginBottom:20 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"rgba(249,115,22,.12)",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Cpu size={18} color="#f97316"/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:12, fontWeight:700, color:"var(--t1)" }}>{deviceInfo.ssid}</p>
            <p style={{ fontSize:10, color:"var(--t3)", fontFamily:"'IBM Plex Mono',monospace" }}>{deviceInfo.mac}</p>
          </div>
          {sig && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
              <SignalBars rssi={deviceInfo.rssi}/>
              <span style={{ fontSize:9, color:sig.color, fontWeight:600 }}>{sig.label}</span>
            </div>
          )}
        </div>
      )}
      
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {/* NAMA PERANGKAT */}
        <div>
          <label style={{ display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase",
            letterSpacing:1, color:"var(--t3)", marginBottom:6 }}>Nama Perangkat</label>
          <div style={{ position:"relative" }}>
            <Tag size={13} style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",
              color:"var(--t3)", pointerEvents:"none" }}/>
            <input className="pm-input" style={{ paddingLeft:36 }} value={form.name} autoFocus
              onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="N"/>
          </div>
        </div>

        {/* LOKASI PEMASANGAN */}
        <div>
          <label style={{ display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase",
            letterSpacing:1, color:"var(--t3)", marginBottom:6 }}>Lokasi Pemasangan</label>
          <div style={{ position:"relative" }}>
            <MapPin size={13} style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",
              color:"var(--t3)", pointerEvents:"none" }}/>
            <input className="pm-input" style={{ paddingLeft:36 }}
              value={form.location} placeholder="12"
              onChange={e=>setForm(p=>({...p,location:e.target.value}))}/>
          </div>
        </div>

        {/* PARAMETER LANJUTAN (Bukan Dropdown Lagi) */}
        <div style={{ background:"var(--input)", borderRadius:12, border:"1px solid var(--bd)", overflow:"hidden" }}>
          <div style={{ padding:"12px 14px", fontSize:12, fontWeight:600, color:"var(--t2)",
            display:"flex", alignItems:"center", gap:7 }}>
            <Sliders size={13} color="#f97316"/> Parameter Lanjutan 
          </div>
          <div style={{ padding:"0 14px 14px", display:"flex", flexDirection:"column", gap:12 }}>
            {[
              { key:"maxCurrent", label:"Batas Arus Maks", suffix:"A" },
              { key:"tariff",     label:"Tarif Listrik",   suffix:"Rp/kWh" },
            ].map(f=>(
              <div key={f.key} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <label style={{ fontSize:11, color:"var(--t3)", flexShrink:0, width:110 }}>{f.label}</label>
                <div style={{ position:"relative", flex:1 }}>
                  <input type="number" className="pm-input"
                    value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:+e.target.value}))}
                    style={{ padding:"8px 44px 8px 10px", fontSize:13 }}/>
                  <span style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
                    fontSize:10, color:"var(--t4)", pointerEvents:"none" }}>{f.suffix}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className="pm-btn-primary" disabled={!form.name||!form.location}
          onClick={()=>onDone(form)}>
          <Lock size={14}/> Mulai Pairing
        </button>
        {/* Pesan peringatan jika form kosong */}
        {(!form.name||!form.location) && (
          <p style={{ fontSize:11, color:"var(--t4)", textAlign:"center", marginTop:-8 }}>Nama dan lokasi wajib diisi</p>
        )}
      </div>
    </div>
  );
}

/* Step 3 — Connecting */
function StepConnecting({ deviceInfo, config, onSuccess }) {
  const [phase, setPhase] = useState(0);
  const phases = ["Menghubungkan ke jaringan…","Autentikasi perangkat…","Mengirim konfigurasi…","Memverifikasi koneksi…","Terhubung!"];

  useEffect(()=>{
    const timings=[900,1100,900,800,600]; let p=0;
    const next=()=>{ if(p>=phases.length-1){onSuccess();return;} p++; setPhase(p); setTimeout(next,timings[p]); };
    const t=setTimeout(next,timings[0]);
    return ()=>clearTimeout(t);
  },[onSuccess]);

  const progress=Math.round((phase/(phases.length-1))*100);
  return (
    <div style={{ padding:"8px 24px 32px", textAlign:"center", animation:"pm-slide-r .3s ease" }}>
      <div style={{ position:"relative", width:110, height:110, margin:"0 auto 24px",
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ position:"absolute", inset:0, borderRadius:"50%",
          border:"2px dashed rgba(249,115,22,.15)", animation:"pm-spin 8s linear infinite" }}/>
        <div style={{ position:"absolute", inset:12, borderRadius:"50%",
          border:"2px dashed rgba(249,115,22,.25)", animation:"pm-spin 5s linear infinite reverse" }}/>
        {phase<phases.length-1
          ? <SpinRing size={56} color="#f97316" strokeWidth={3}/>
          : <div style={{ animation:"pm-success .5s cubic-bezier(.34,1.56,.64,1)" }}>
              <CheckCircle size={56} color="#22c55e"/>
            </div>}
        <div style={{ position:"absolute", inset:-2, animation:`pm-spin ${1.8+phase*.3}s linear infinite` }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#f97316",
            boxShadow:"0 0 8px #f97316", position:"absolute", top:0, left:"50%", transform:"translateX(-50%)" }}/>
        </div>
      </div>
      <p style={{ fontSize:14, fontWeight:700, color:"var(--t1)", marginBottom:6 }}>{phases[phase]}</p>
      <p style={{ fontSize:11, color:"var(--t3)", marginBottom:20 }}>{deviceInfo?.ssid} · {config?.location}</p>
      <div style={{ maxWidth:280, margin:"0 auto 14px" }}>
        <div className="pm-bar-track"><div className="pm-bar-fill" style={{ width:`${progress}%` }}/></div>
      </div>
      <div style={{ maxWidth:280, margin:"0 auto", textAlign:"left" }}>
        {phases.slice(0,-1).map((p,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0",
            opacity:i>phase?.3:1, transition:"opacity .3s" }}>
            {i<phase
              ? <CheckCircle size={13} color="#22c55e"/>
              : i===phase
                ? <div style={{ width:13, height:13, borderRadius:"50%", border:"2px solid #f97316",
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:"#f97316",
                      animation:"pm-bounce-dot 1s ease-in-out infinite" }}/>
                  </div>
                : <div style={{ width:13, height:13, borderRadius:"50%", border:"2px solid rgba(255,255,255,.1)" }}/>}
            <span style={{ fontSize:11, color:i<phase?"#22c55e":i===phase?"var(--t1)":"var(--t4)",
              fontWeight:i===phase?600:400 }}>{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Step 4 — Sukses */
function StepSuccess({ newDevice, onClose }) {
  return (
    <div style={{ padding:"8px 24px 32px", textAlign:"center", animation:"pm-slide-r .3s ease" }}>
      <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
        <SuccessCheck size={80}/>
      </div>
      <h3 style={{ fontSize:18, fontWeight:700, color:"var(--t1)", marginBottom:6 }}>Perangkat Berhasil Ditambahkan!</h3>
      <p style={{ fontSize:12, color:"var(--t3)", lineHeight:1.6, maxWidth:320, margin:"0 auto 22px" }}>
        {newDevice?.name} kini terhubung dan siap melakukan monitoring energi secara real-time.
      </p>
      <div style={{ background:"var(--input)", borderRadius:14, padding:18,
        border:"1px solid var(--bd)", textAlign:"left", marginBottom:22 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14,
          paddingBottom:12, borderBottom:"1px solid var(--bd)" }}>
          <div style={{ width:42, height:42, borderRadius:12, background:"rgba(249,115,22,.12)",
            border:"1.5px solid rgba(249,115,22,.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Cpu size={20} color="#f97316"/>
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:"var(--t1)" }}>{newDevice?.name}</p>
            <p style={{ fontSize:11, color:"#f97316", fontFamily:"'IBM Plex Mono',monospace" }}>{newDevice?.id}</p>
          </div>
          <div style={{ marginLeft:"auto" }}>
            <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700, color:"#22c55e" }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e" }}/>Online
            </span>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[["Lokasi",newDevice?.location],["Firmware",newDevice?.fw],
            ["Batas Arus",`${newDevice?.maxCurrent} A`],
            ["Tarif",`Rp ${newDevice?.tariff?.toLocaleString("id-ID")}/kWh`]].map(([k,v])=>(
            <div key={k}>
              <p style={{ fontSize:9.5, fontWeight:700, textTransform:"uppercase", letterSpacing:.8,
                color:"var(--t4)", marginBottom:3 }}>{k}</p>
              <p style={{ fontSize:12, fontWeight:600, color:"var(--t1)", fontFamily:"'IBM Plex Mono',monospace" }}>{v}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <button className="pm-btn-ghost" style={{ flex:1 }} onClick={onClose}>Tutup</button>
        <button className="pm-btn-primary" style={{ flex:2 }} onClick={onClose}>
          <Zap size={14}/> Buka Dashboard
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAIRING MODAL
═══════════════════════════════════════════════════════════════ */
function PairingModal({ onClose, onDeviceAdded }) {
  const LABELS = ["Perangkat", "Konfigurasi", "Pairing", "Selesai"];
  const [step,       setStep]       = useState(0);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [config,     setConfig]     = useState(null);
  const [newDevice,  setNewDevice]  = useState(null);

  const goNext = (n) => setStep(n);
  const goBack = () => setStep(s => Math.max(0, s - 1));

  const handleSuccess = useCallback(() => {
    const dev = {
      id:         generateDeviceId(),
      location:   config?.location   || "Baru",
      connected:  true,
      lastSeen:   "Baru saja",
      fw:         deviceInfo?.fw     || "v2.1.4",
      mac:        deviceInfo?.mac,
      maxCurrent: config?.maxCurrent || 10,
      tariff:     config?.tariff     || 1444,
      name:       config?.name       || "ESP32", // Menyimpan nama dari konfigurasi form
    };
    setNewDevice(dev);
    goNext(3);
    onDeviceAdded?.(dev);
  }, [deviceInfo, config, onDeviceAdded]);

  const titles = [
    "Scan Jaringan WiFi",
    "Konfigurasi Perangkat",
    "Menghubungkan…",
    "Pairing Berhasil",
  ];
  const canClose = step !== 2;

  return (
    <>
      <style>{PAIRING_CSS}</style>
      <div className="pm-overlay" onClick={e => { if(e.target === e.currentTarget && canClose) onClose(); }}>
        <div className="pm-modal">
          {/* Header */}
          <div style={{ padding:"20px 24px 0", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                {step > 0 && step < 3 && (
                  <button onClick={goBack}
                    style={{ width:28, height:28, borderRadius:8, background:"var(--input)",
                      border:"1px solid var(--bd)", display:"flex", alignItems:"center",
                      justifyContent:"center", cursor:"pointer", color:"var(--t2)" }}>
                    <ChevronLeft size={15}/>
                  </button>
                )}
                <div>
                  <h2 style={{ fontSize:15, fontWeight:700, color:"var(--t1)", lineHeight:1 }}>{titles[step]}</h2>
                  <p style={{ fontSize:10, color:"var(--t3)", marginTop:3 }}>IoT Energy Monitor · ESP32 Pairing</p>
                </div>
              </div>
              {canClose && (
                <button onClick={onClose}
                  style={{ width:30, height:30, borderRadius:9, background:"var(--input)",
                    border:"1px solid var(--bd)", display:"flex", alignItems:"center",
                    justifyContent:"center", cursor:"pointer", color:"var(--t3)" }}>
                  <X size={15}/>
                </button>
              )}
            </div>
            <StepIndicator current={step} labels={LABELS}/>
            <div className="pm-bar-track" style={{ marginBottom:20 }}>
              <div className="pm-bar-fill" style={{ width:`${(step / 3) * 100}%` }}/>
            </div>
          </div>

          {/* Content */}
          <div className="pm-content">
            {step === 0 && <StepScanWifi onFound={info => { setDeviceInfo(info); goNext(1); }} />}
            {step === 1 && <StepConfigure deviceInfo={deviceInfo} onDone={cfg => { setConfig(cfg); goNext(2); }} />}
            {step === 2 && <StepConnecting deviceInfo={deviceInfo} config={config} onSuccess={handleSuccess} />}
            {step === 3 && newDevice && <StepSuccess newDevice={newDevice} onClose={onClose} />}
          </div>

          {/* Footer */}
          {step < 2 && (
            <div style={{ padding:"12px 24px", borderTop:"1px solid var(--bd)",
              display:"flex", alignItems:"center", gap:7, flexShrink:0 }}>
              <Shield size={11} color="var(--t4)"/>
              <span style={{ fontSize:10, color:"var(--t4)" }}>
                Koneksi terenkripsi AES-256 · Autentikasi HMAC-SHA256
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DEVICE LIST PAGE
═══════════════════════════════════════════════════════════════ */
export function DeviceListPage({ devices: initialDevices, onSelect, user }) {
  const [devices,     setDevices] = useState(initialDevices);
  const [showPairing, setShow]    = useState(false);
  const [addedFlash,  setFlash]   = useState(null);

  const handleDeviceAdded = (dev) => {
    setDevices(p=>[...p,dev]);
    setFlash(dev.id);
    setTimeout(()=>setFlash(null),3000);
  };

  const connected    = devices.filter(d=>d.connected).length;
  const disconnected = devices.length - connected;

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)" }}>
      <header style={{ background:"var(--topbar)", borderBottom:"1px solid var(--bd)",
        padding:"13px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ padding:8, borderRadius:12, background:"#f97316" }}><Zap size={18} color="#fff"/></div>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:"var(--t1)", lineHeight:1 }}>IoT Energy Monitor</p>
            <p style={{ fontSize:10, color:"var(--t3)", marginTop:2 }}>Device Management Console</p>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 12px 5px 6px",
          borderRadius:10, background:"var(--input)", border:"1px solid var(--bd)" }}>
          <Avatar user={user} size={24} radius={7} fontSize={11}/>
          <span style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e" }}/>
          <span style={{ fontSize:12, color:"var(--t2)", fontWeight:500 }}>{user?.name}</span>
        </div>
      </header>

      <main style={{ maxWidth:900, margin:"0 auto", padding:"32px 20px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
          flexWrap:"wrap", gap:16, marginBottom:20 }}>
          <div>
            <h2 style={{ fontSize:24, fontWeight:700, color:"var(--t1)", marginBottom:4 }}>Perangkat Saya</h2>
            <p style={{ fontSize:13, color:"var(--t3)" }}>Pilih perangkat ESP32 untuk mulai monitoring</p>
          </div>
          <button onClick={()=>setShow(true)}
            style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 20px",
              borderRadius:12, fontSize:13, fontWeight:700, cursor:"pointer",
              background:"#f97316", border:"none", color:"#fff",
              boxShadow:"0 4px 18px rgba(249,115,22,.35)", transition:"opacity .15s,transform .15s" }}
            onMouseEnter={e=>{ e.currentTarget.style.opacity=".9"; e.currentTarget.style.transform="translateY(-1px)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.opacity="1";  e.currentTarget.style.transform=""; }}>
            <Plus size={16}/> Tambah Perangkat
          </button>
        </div>

        <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap" }}>
          {[
            { label:"Total Perangkat", value:devices.length,  color:"var(--t2)", bg:"var(--input)" },
            { label:"Terhubung",       value:connected,        color:"#22c55e",   bg:"rgba(34,197,94,.07)" },
            { label:"Offline",         value:disconnected,     color:"#64748b",   bg:"var(--input)" },
          ].map(s=>(
            <div key={s.label} style={{ display:"flex", alignItems:"center", gap:10,
              padding:"9px 16px", borderRadius:11, background:s.bg,
              border:"1px solid var(--bd)", flexShrink:0 }}>
              <span style={{ fontSize:18, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</span>
              <span style={{ fontSize:11, color:"var(--t3)", fontWeight:500 }}>{s.label}</span>
            </div>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:16 }}>
          {devices.map(dev=>{
            const isNew = addedFlash===dev.id;
            return (
              <Card key={dev.id}
                style={{ padding:22, cursor:dev.connected?"pointer":"not-allowed",
                  opacity:dev.connected?1:.55, transition:"border-color .2s,transform .2s,box-shadow .2s",
                  position:"relative",
                  ...(isNew?{borderColor:"rgba(34,197,94,.5)",boxShadow:"0 0 0 3px rgba(34,197,94,.15),var(--shadow)"}:{}) }}
                onClick={()=>dev.connected&&onSelect(dev)}
                onMouseEnter={e=>{ if(dev.connected){
                  e.currentTarget.style.borderColor="rgba(249,115,22,.5)";
                  e.currentTarget.style.transform="translateY(-2px)";
                  e.currentTarget.style.boxShadow="0 8px 28px rgba(249,115,22,.12)"; }}}
                onMouseLeave={e=>{
                  e.currentTarget.style.borderColor=isNew?"rgba(34,197,94,.5)":"var(--bd)";
                  e.currentTarget.style.transform="";
                  e.currentTarget.style.boxShadow=isNew?"0 0 0 3px rgba(34,197,94,.15),var(--shadow)":"var(--shadow)"; }}>
                {isNew&&(
                  <div style={{ position:"absolute", top:10, right:10, zIndex:2 }}>
                    <span style={{ fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:99,
                      background:"#22c55e", color:"#fff", textTransform:"uppercase", letterSpacing:.7 }}>Baru</span>
                  </div>
                )}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
                  <div style={{ padding:11, borderRadius:14, background:"var(--input)" }}><Cpu size={22} color="#f97316"/></div>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ width:7, height:7, borderRadius:"50%",
                      background:dev.connected?"#4ade80":"var(--bd)",
                      ...(dev.connected?{boxShadow:"0 0 0 3px rgba(74,222,128,.2)"}:{}) }}/>
                    <span style={{ fontSize:11, fontWeight:700, color:dev.connected?"#4ade80":"var(--t4)" }}>
                      {dev.connected?"Connected":"Offline"}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize:14, fontWeight:700, color:"var(--t1)", marginBottom:3 }}>{dev.name}</p>
                <p style={{ fontSize:12, fontWeight:600, color:"#f97316", marginBottom:16,
                  fontFamily:"'IBM Plex Mono',monospace" }}>{dev.id}</p>
                {[["Lokasi",dev.location],["Firmware",dev.fw],["Terakhir aktif",dev.lastSeen]].map(([k,v])=>(
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                    <span style={{ fontSize:11, color:"var(--t4)" }}>{k}</span>
                    <span style={{ fontSize:11, fontWeight:600,
                      color:k==="Terakhir aktif"&&dev.connected?"#4ade80":"var(--t2)",
                      fontFamily:k==="Firmware"?"'IBM Plex Mono',monospace":undefined }}>{v}</span>
                  </div>
                ))}
                {dev.connected&&(
                  <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:14,
                    fontSize:12, fontWeight:700, color:"#f97316" }}>
                    <span>Buka Dashboard</span><ChevronRight size={14}/>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </main>

      {showPairing&&<PairingModal onClose={()=>setShow(false)} onDeviceAdded={handleDeviceAdded}/>}
    </div>
  );
}

export default DeviceListPage;